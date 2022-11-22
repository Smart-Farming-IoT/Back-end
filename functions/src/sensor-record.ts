/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */

// import libraries
import { app, db, AISTOKEN } from './main';

const axios = require("axios");

// initialize the collection
const collectionName = 'sensor-record';

interface SensorRecord {
  'light_intensity': string,
  'ph': number,
  'moisture': string,
  'timestamp': number,
  'device_id': string,
}

interface MagellanSensorRecord {
  'data': Object,
  'timestamp': Date,
  'device_id': string,
}

// post a new sensor record from magellan
app.post('/magellan-sensor-record/new', async (req, res) => {
  try {
    const deviceCollectionName = 'device';

    const imei = req.body.ThingInfo.IMEI;
    const data = req.body.Sensors;
    const timestamp = req.body.Timestamp;
    var device_id = "";

    const querySnapshot = await db.collection(deviceCollectionName).get();
    var errorFlag = true;
    querySnapshot.forEach(
      (device) => {
        const data = device.data()
        if (data.imei == imei) {
          device_id = device.id;
          errorFlag = false;
          return;
        }
      }
    );
    if (errorFlag) {
      res.status(500).json({
        "status": "failed",
        "msg": `Cannot create a new sensor record: device id not found for IMEI ${imei}`,
      });
      return;
    }
    const sensorRecord: MagellanSensorRecord = {
      'data': data,
      'timestamp': timestamp,
      'device_id': device_id,
    };
    const newDoc = await db.collection(collectionName).add(sensorRecord);
    res.status(200).json({
      "status": "success",
      "msg": `Created a new sensor record: ${newDoc.id}`,
      "id": newDoc.id,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": `Cannot create a new sensor record: ${error}`,
    });
  }
});

// post a new sensor record
app.post('/sensor-record/new', async (req, res) => {
  try {
    const deviceCollectionName = 'device';
    const deviceQuerySnapshot = await db.collection(deviceCollectionName).get();
    var errorFlag = true;
    deviceQuerySnapshot.forEach(
      (device) => {
        if (device.id == req.body['device_id']) {
          errorFlag = false;
          return;
        }
      }
    );
    if (errorFlag) {
      res.status(500).json({
        "status": "failed",
        "msg": "Cannot create a new sensor record: device id not found",
      });
      return;
    }
    const sensorRecord: SensorRecord = {
      'light_intensity': req.body['light_intensity'],
      'ph': req.body['ph'],
      'moisture': req.body['moisture'],
      'timestamp': req.body['timestamp'],
      'device_id': req.body['device_id'],
    };
    const newDoc = await db.collection(collectionName).add(sensorRecord);
    res.status(200).json({
      "status": "success",
      "msg": `Created a new sensor record: ${newDoc.id}`,
      "id": newDoc.id,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot create a new sensor record",
    });
  }
});

// read all sensor record
app.post('/sensor-record', async (req, res) => {
  const deviceId = req.body['device_id'];
  try {
    const querySnapshot = await db.collection(collectionName).get();
    const list: any[] = [];
    querySnapshot.forEach(
      (sensorRecord) => {
        const data = sensorRecord.data();
        if (data.device_id === deviceId) {
          list.push({
            "id": sensorRecord.id,
            "data": data
          });
        }
      }
    );
    res.status(200).json({
      "sensor_record_list": list,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot get a sensor record list",
    });
  }
});

// command
app.post('/sensor-record/command', async (req, res) => {
  const deviceId = req.body['device_id'];

  var command = 0;
  var target = req.body['target'];
  if (req.body['command'] === "on") {
    command = 1;
  }
  var message = `สั่งการ ${target} ไม่สำเร็จ`

  const deviceCollectionName = 'device';

  try {
    const deviceQuerySnapshot = await db.collection(deviceCollectionName).get();
    for (var i in deviceQuerySnapshot.docs) {
      var device = deviceQuerySnapshot.docs[i]
      if (device.id === deviceId) {
        // const data = device.data();
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
    res.status(200).json({
      "msg": message,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot get a sensor record list",
    });
  }
});
