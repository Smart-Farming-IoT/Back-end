/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */

// import libraries
import { app, db, TOKEN } from './main';
import { readAllDevicesByUserId } from './device';

const https = require("https")

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
        else if (req.body.events[0].message.text === "แสดงเซนเซอร์ทั้งหมด") {
          var devices = await readAllDevicesByUserId(firebaseUserId);
          var message = "เซนเซอร์ของคุณทั้งหมดมีดังนี้"
          console.log(devices)
          devices.forEach(device => {
            console.log(device)
            message += `\n${device.name} (${device.imei})`
            if (device.sensor_records.length > 0) {
              for (var key in device.sensor_records[0].data) {
                var value = device.sensor_records[0].data[key];
                message += `\n - ${key}: ${value}`
              }
            }
            message += "\n"
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
