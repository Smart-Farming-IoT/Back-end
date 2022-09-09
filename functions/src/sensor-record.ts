/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */

// import libraries
import { app, db } from './main';

// initialize the collection
const collectionName = 'sensor-record';

interface SensorRecord {
  'light_intensity': string,
  'ph': number,
  'moisture': string,
  'timestamp': number,
  'device_id': string,
}

// post a new sensor record
app.post('/sensor-record/new', async (req, res) => {
  try {
    const deviceCollectionName = 'device';
    const querySnapshot = await db.collection(deviceCollectionName).get();
    var errorFlag = true;
    querySnapshot.forEach(
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
            "light_intensity": data.light_intensity,
            "ph": data.ph,
            "moisture": data.moisture,
            "timestamp": data.timestamp
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
