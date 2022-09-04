/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */

// import libraries
import { app, db } from './main';

// initialize the collection
const collectionName = 'sensor';

interface Sensor {
  'sensor_imei': string,
  'status': string,
  'user_id': number,
}

// post a new sensor
app.post('/sensor', async (req, res) => {
  try {
    const querySnapshot = await db.collection(collectionName).get();
    const list: any[] = [];
    var errorFlag = false;
    querySnapshot.forEach(
      (sensor) => {
        if (errorFlag) {
          return;
        }
        const data = sensor.data();
        if (data.user_id === req.body['user_id']) {
          if (data.sensor_imei == req.body['sensor_imei']) {
            res.status(500).json({
              "status": "failed",
              "msg": "Cannot create a new sensor: sensor imei already existed",
            });
            errorFlag = true;
            return;
          }
          list.push({
            "id": sensor.id,
            "sensor_imei": data.sensor_imei,
            "status": data.status,
            "user_id": data.user_id,
          });
        }
      }
    );
    if (errorFlag) {
      return;
    }
    
    if (!(["active", "deactived"].includes(req.body['status']))) {
      res.status(500).json({
        "status": "failed",
        "msg": `Cannot create a new sensor: invalid status`,
      });
      return;
    }
    const sensor: Sensor = {
      'sensor_imei': req.body['sensor_imei'],
      'status': req.body['status'],
      'user_id': req.body['user_id'],
    };
    const newDoc = await db.collection(collectionName).add(sensor);
    res.status(200).json({
      "status": "success",
      "msg": `Created a new sensor: ${newDoc.id}`,
      "id": newDoc.id,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot create a new sensor",
    });
  }
});
