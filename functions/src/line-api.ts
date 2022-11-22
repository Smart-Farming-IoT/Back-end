/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */

// import libraries
import { app, db, TOKEN, AISTOKEN } from './main';
import { readAllDevicesByUserId } from './device';

const axios = require("axios");
const https = require("https");

async function linkAccount(lineUserId: string, accountToken: string) {
  try {
    const linkerCollectionName = 'line-user-linker';
    const querySnapshot = await db.collection(linkerCollectionName).get();
    var errorFlag = false;
    var linkerFoundFlag = false;
    var msg = "";
    querySnapshot.forEach(
      (linker) => {
        if (errorFlag || linkerFoundFlag) {
          return;
        }
        if (linker.id == accountToken) {
          const data = linker.data();
          if (data.line_user_id != '') {
            msg = "Cannot link the account. User is already linked.",
            errorFlag = true;
            return;
          }
          else if (data.timeout < Date.now()) {
            msg = "Cannot link the account. Token is invalid.",
            errorFlag = true;
            return;
          }
          else {
            db.collection(linkerCollectionName).doc(linker.id).update({
                "line_user_id": lineUserId
              }).catch((error) => {
                msg = `Cannot link the account. ${error}`;
                errorFlag = true;
              });
            if (errorFlag) {
              return;
            }
            msg = "Link account successful.";
            linkerFoundFlag = true;
            return;
          }
        }
      }
    );
    if (!linkerFoundFlag && msg==="") {
      msg = "Token is invalid."
    }
    return msg;
  } catch (error) {
    return `An error occurred. ${error}`
  }
}

async function findFirebaseUserId(req: any) {
  try {
    const linkerCollectionName = 'line-user-linker';
    const querySnapshot = await db.collection(linkerCollectionName).get();
    var linkerFoundFlag = false;
    var firebaseUserId = null;
    querySnapshot.forEach(
      (linker) => {
        if (linkerFoundFlag) {
          return;
        }
        const data = linker.data();
        if (data.line_user_id == req.body.events[0].source.userId) {
          firebaseUserId = data.firebase_user_id
          linkerFoundFlag = true;
          return;
        }
      }
    );
    return firebaseUserId;
  } catch (error) {
    return `An error occurred. ${error}`
  }
}

// line webhook
app.post('/line-api/webhook', async (req, res) => {   
  try {
    // res.send("HTTP POST request sent to the webhook URL!")
    var firebaseUserId = await findFirebaseUserId(req)
    if (req.body.events[0].type === "message") {
      var dataString = null
      // linked account
      if (firebaseUserId) {
        if (req.body.events[0].message.text === "สวัสดี") {
          dataString = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
              {
                "type": "text",
                "text": "สวัสดี"
              }
            ]
          })
        }
        else if (req.body.events[0].message.text === "คู่มือการใช้งาน") {
          dataString = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: []
          })
        }
        else if (req.body.events[0].message.text === "แสดงเซนเซอร์ทั้งหมด") {
          var devices = await readAllDevicesByUserId(firebaseUserId);
          var message = "เซนเซอร์ของคุณทั้งหมดมีดังนี้"
          devices.forEach(device => {
            console.log(device)
            message += `\n${device.name} (${device.imei})`
            if (device.sensor_records.length > 0) {
              for (var key in device.sensor_records[0].data) {
                if (key.substring(0, 2) === "sw") {
                  continue;
                }
                var value = device.sensor_records[0].data[key];
                message += `\n - ${key}: ${value}`
              }
            }
            // message += "\n"
          }); 
          dataString = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
              {
                "type": "text",
                "text": message
              }
            ]
          })
        }
        else if (req.body.events[0].message.text === "แสดงปั้ม/วาล์วน้ำทั้งหมด") {
          var devices = await readAllDevicesByUserId(firebaseUserId);
          var message = "ปั้ม/วาล์วน้ำของคุณทั้งหมดมีดังนี้";
          var columns: { text: string; title: string; actions: { type: string; label: string; text: string; }[]; }[] = [];
          devices.forEach(device => {
            console.log(device)
            message += `\n${device.name} (${device.imei})`
            if (device.sensor_records.length > 0) {
              for (var key in device.sensor_records[0].data) {
                if (key.substring(0, 2) !== "sw") {
                  continue;
                }
                // var value = device.sensor_records[0].data[key];
                var value = "ปิด";
                var command = "เปิด";
                if (device.sensor_records[0].data[key] != 0) {
                  value = "เปิด";
                  command = "ปิด";
                }
                message += `\n - ${key}: ${value}`

                columns.push(
                  {
                    title: `ปั้ม/วาล์วน้ำ ${key} ของ ${device.name}`,
                    text: `${value}อยู่`,
                    actions: [ 
                      {
                        type: `message`,
                        label: `${command} ${key}`,
                        text: `${command} ${key}`,
                      } 
                    ]
                  } 
                );
              }
            }
            // message += "\n"
          }); 
          dataString = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
              // {
              //   "type": "text",
              //   "text": message
              // },
              {
                type: "template",
                altText: "template message",
                template: {
                  type: "carousel",
                  columns: columns
                }
              }   
            ]
          })
        }
        else if (req.body.events[0].message.text.substring(0, 4) === "เปิด" || req.body.events[0].message.text.substring(0, 3) === "ปิด") {
          var command = 0;
          var target = req.body.events[0].message.text.substring(4, req.body.events[0].message.text.length)
          if (req.body.events[0].message.text.substring(0, 4) === "เปิด") {
            command = 1;
            target = req.body.events[0].message.text.substring(5, req.body.events[0].message.text.length)
          }

          var devices = await readAllDevicesByUserId(firebaseUserId);
          var message = `สั่งการ ${target} ไม่สำเร็จ`

          for (const device of devices) {
            if (device.sensor_records.length > 0) {
              for (var key in device.sensor_records[0].data) {
                if (key == target) {
                  await axios.post(
                    "https://magellan.ais.co.th/quasar/quasarapi/api/v2/control/thing",
                    {
                      "ControlByType": "Project",
                      "ControlKey": "6310d5290a741a00019cce58",
                      "ThingId": ["6311dd52f3be140001686f16"],
                      "Sensors": {[`${target}`]: command}
                    },
                    {
                      headers: { Authorization: `Bearer ${AISTOKEN}` }
                    }
                  ).then((aisResponse: any) => {
                    console.log(aisResponse.data);
                    // message = `เปิด ${target} สำเร็จ (${aisResponse.data.OperationStatus.Message.TH})`
                    message = `สั่งการ ${target} สำเร็จ`
                  }).catch((error: any) => {
                    console.log(error.response)
                    message = `สั่งการ ${target} ไม่สำเร็จ ${error.response}`
                  });
                  break;
                }
              }
            }
          }
          dataString = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
              {
                "type": "text",
                "text": message
              }
            ]
          })
        }
        else {
          dataString = JSON.stringify({
            replyToken: req.body.events[0].replyToken,
            messages: [
              {
                "type": "text",
                "text": "Command not found."
              }
            ]
          })
        }
      }
      // link new account
      else if (req.body.events[0].message.text.slice(0, 4) === "LINK") {
        var msg = await linkAccount(req.body.events[0].source.userId, req.body.events[0].message.text.slice(4))
        dataString = JSON.stringify({
          replyToken: req.body.events[0].replyToken,
          messages: [
            {
              "type": "text",
              "text": msg
            }
          ]
        })
      }
      else {
        dataString = JSON.stringify({
          replyToken: req.body.events[0].replyToken,
          messages: [
            {
              "type": "text",
              "text": "Please link an account before use the service."
            }
          ]
        })
      }

      const headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + TOKEN
      }

      const webhookOptions = {
        "hostname": "api.line.me",
        "path": "/v2/bot/message/reply",
        "method": "POST",
        "headers": headers,
        "body": dataString
      }

      const request = https.request(webhookOptions, (res: any) => {
        res.on("data", (data: any) => {
          process.stdout.write(data)
        })
      })

      request.on("error", (err: any) => {
        console.error(err)
      })

      request.write(dataString)
      request.end()
    }
  } catch (error) {
    dataString = JSON.stringify({
      replyToken: req.body.events[0].replyToken,
      messages: [
        {
          "type": "text",
          "text": error
        }
      ]
    })

    const headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + TOKEN
    }

    const webhookOptions = {
      "hostname": "api.line.me",
      "path": "/v2/bot/message/reply",
      "method": "POST",
      "headers": headers,
      "body": dataString
    }

    const request = https.request(webhookOptions, (res: any) => {
      res.on("data", (data: any) => {
        process.stdout.write(data)
      })
    })

    request.on("error", (err: any) => {
      console.error(err)
    })

    request.write(dataString)
    request.end()

    // res.status(500).json({
    //   "status": "failed",
    //   "msg": "Internal error",
    // });
  }
  res.send(dataString)
});
