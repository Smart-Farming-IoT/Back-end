/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */

// import libraries
import { app, db } from './main';

// initialize the collection
const collectionName = 'device';

interface device {
  'imei': string,
  'name': string,
  'user_id': string,
}

// post a new device
app.post('/device/new', async (req, res) => {
  try {
    const querySnapshot = await db.collection(collectionName).get();
    var errorFlag = false;
    querySnapshot.forEach(
      (device) => {
        if (errorFlag) {
          return;
        }
        const data = device.data();
        if (data.imei == req.body['imei']) {
          res.status(500).json({
            "status": "failed",
            "msg": "Cannot create a new device: device imei already existed",
          });
          errorFlag = true;
          return;
        }
      }
    );
    if (errorFlag) {
      return;
    }
    if (req.body['name'] === "") {
      res.status(500).json({
        "status": "failed",
        "msg": `Cannot create a new device: invalid status`,
      });
      return;
    }
    const device: device = {
      'imei': req.body['imei'],
      'name': req.body['name'],
      'user_id': req.body['user_id'],
    };
    const newDoc = await db.collection(collectionName).add(device);
    res.status(200).json({
      "status": "success",
      "msg": `Created a new device: ${newDoc.id}`,
      "id": newDoc.id,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot create a new device",
    });
  }
});

// read all device
app.post('/device', async (req, res) => {
  const userId = req.body['user_id'];
  try {
    const querySnapshot = await db.collection(collectionName).get();
    const sensorRecordQuerySnapshot = await db.collection("sensor-record").get();
    const list: any[] = [];
    querySnapshot.forEach(
      (device) => {
        const data = device.data();
        const sensorRecordList: any[] = [];

        sensorRecordQuerySnapshot.forEach(
          (sensorRecord) => {
            const data = sensorRecord.data();
            if (data.device_id === device.id) {
              sensorRecordList.push({
                "id": sensorRecord.id,
                "light_intensity": data.light_intensity,
                "ph": data.ph,
                "moisture": data.moisture,
                "timestamp": Number(data.timestamp)
              });
            }
          }
        );

        if (sensorRecordList.length > 0) {
          sensorRecordList.sort((a, b) => b.timestamp - a.timestamp)
          data.lastest_light_intensity = sensorRecordList[0].light_intensity
          data.lastest_ph = sensorRecordList[0].ph
          data.lastest_moisture = sensorRecordList[0].moisture
          data.lastest_timestamp = sensorRecordList[0].timestamp
        }
        else {
          data.lastest_light_intensity = "-"
          data.lastest_ph = "-"
          data.lastest_moisture = "-"
          data.lastest_timestamp = 0
        }

        if (data.user_id === userId) {
          list.push({
            "id": device.id,
            "imei": data.imei,
            "name": data.name,
            "latest_light_intensity": data.lastest_light_intensity,
            "latest_ph": data.lastest_ph,
            "latest_moisture": data.lastest_moisture,
            "latest_timestamp": data.lastest_timestamp,
            "sensor_records": sensorRecordList.slice(0, 5)
          });
        }
      }
    );
    list.sort((a, b) => {
      if (a.imei < b.imei)
        return -1;
      if (a.imei > b.imei)
        return 1;
      return 0;
    });
    res.status(200).json({
      "device_list": list,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot get a device list",
    });
  }
});

// delete a device
app.delete('/device', async (req, res) => {
  var record_id = req.body['id'];
  try {
    db.collection(collectionName).doc(record_id).delete()
      .then(() => res.status(200).json({
        "status": "success",
        "msg": `Deleted a device: ${record_id}`,
        "id": record_id,
      }))
      .catch((error) => res.status(500).json({
        "status": "failed",
        "msg": `Cannot delete a device: ${error}`,
        "description": error,
      }));
  } catch (error) {
    res.status(501).json({
      "status": "failed",
      "msg": `Cannot delete a device: ${error}`,
      "description": error,
    });
  }
});

// update device
app.put('/device', async (req, res) => {
  var record_id = req.body['id'];
  delete req.body['id'];
  if ("imei" in req.body) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot update a device: device imei connot be updated",
    });
    return;
  }
  if ("name" in req.body && req.body['name'] === "") {
    res.status(500).json({
      "status": "failed",
      "msg": `Cannot update a device: invalid name`,
    });
    return;
  }
  var toBeEditedData: any = null;
  const querySnapshot = await db.collection(collectionName).get();
  querySnapshot.forEach(
    (device) => {
      if (device.id == record_id) {
        toBeEditedData = device.data();
      }
    }
  )
  if (toBeEditedData == null) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot edit a device: invalid id",
    });
    return;
  }
  await db.collection(collectionName).doc(record_id).set(req.body, { merge: true })
    .then(() => res.status(200).json({
      "status": "success",
      "msg": `Updated a device ${record_id}`,
      "id": record_id,
    }))
    .catch((error) => res.status(500).json({
      "status": "failed",
      "msg": `Cannot update a device: ${error}`,
    }));
}
);