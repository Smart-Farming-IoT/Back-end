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
  'sensor_id': string,
}

// post a new sensor record
app.post('/sensor-record/new', async (req, res) => {
  try {
    const sensorCollectionName = 'sensor';
    const querySnapshot = await db.collection(sensorCollectionName).get();
    var errorFlag = true;
    querySnapshot.forEach(
      (sensor) => {
        const data = sensor.data();
        if (data.id == req.body['sensor_id']) {
          errorFlag = false;
          return;
        }
      }
    );
    if (errorFlag) {
      res.status(500).json({
        "status": "failed",
        "msg": "Cannot create a new sensor record: sensor id not found",
      });
      return;
    }
    const sensorRecord: SensorRecord = {
      'light_intensity': req.body['light_intensity'],
      'ph': req.body['ph'],
      'moisture': req.body['moisture'],
      'timestamp': req.body['timestamp'],
      'sensor_id': req.body['sensor_id'],
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

// read all sensor
app.post('/sensor', async (req, res) => {
  const userId = req.body['user_id'];
  try {
    const querySnapshot = await db.collection(collectionName).get();
    const list: any[] = [];
    querySnapshot.forEach(
      (sensor) => {
        const data = sensor.data();
        if (data.user_id === userId) {
          list.push({
            "id": sensor.id,
            "sensor_imei": data.sensor_imei,
            "status": data.status
          });
        }
      }
    );
    list.sort((a, b) => {
      if (a.sensor_imei < b.sensor_imei)
        return -1;
      if (a.sensor_imei > b.sensor_imei)
        return 1;
      return 0;
    });
    res.status(200).json({
      "sensor_list": list,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot get a sensor list",
    });
  }
});

// delete a sensor
app.delete('/sensor', async (req, res) => {
  var record_id = req.body['id'];
  try {
    db.collection(collectionName).doc(record_id).delete()
      .then(() => res.status(200).json({
        "status": "success",
        "msg": `Deleted a sensor: ${record_id}`,
        "id": record_id,
      }))
      .catch((error) => res.status(500).json({
        "status": "failed",
        "msg": `Cannot delete a sensor: ${error}`,
        "description": error,
      }));
  } catch (error) {
    res.status(501).json({
      "status": "failed",
      "msg": `Cannot delete a sensor: ${error}`,
      "description": error,
    });
  }
});

// update sensor
app.put('/sensor', async (req, res) => {
  var record_id = req.body['id'];
  if ("sensor_imei" in req.body) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot update a sensor: sensor imei connot be updated",
    });
    return;
  }
  if ("status" in req.body && !(["active", "deactived"].includes(req.body['status']))) {
    res.status(500).json({
      "status": "failed",
      "msg": `Cannot update a sensor: invalid status`,
    });
    return;
  }
  var toBeEditedData: any = null;
  const querySnapshot = await db.collection(collectionName).get();
  querySnapshot.forEach(
    (sensor) => {
      if (sensor.id == record_id) {
        toBeEditedData = sensor.data();
      }
    }
  )
  if (toBeEditedData == null) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot edit a sensor: invalid id",
    });
    return;
  }
  await db.collection(collectionName).doc(record_id).set(req.body, { merge: true })
    .then(() => res.status(200).json({
      "status": "success",
      "msg": `Updated a sensor ${record_id}`,
      "id": record_id,
    }))
    .catch((error) => res.status(500).json({
      "status": "failed",
      "msg": `Cannot update a sensor: ${error}`,
    }));
}
);
