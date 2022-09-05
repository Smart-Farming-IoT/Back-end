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
app.post('/sensor/new', async (req, res) => {
  try {
    const querySnapshot = await db.collection(collectionName).get();
    var errorFlag = false;
    querySnapshot.forEach(
      (sensor) => {
        if (errorFlag) {
          return;
        }
        const data = sensor.data();
        if (data.sensor_imei == req.body['sensor_imei']) {
          res.status(500).json({
            "status": "failed",
            "msg": "Cannot create a new sensor: sensor imei already existed",
          });
          errorFlag = true;
          return;
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
  delete req.body['id'];
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
