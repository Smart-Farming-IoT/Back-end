/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */

// import libraries
import { app, db } from './main';

// initialize the collection
const collectionName = 'to_do';

interface ToDo {
  'note': string,
  'status': string,
  'order': number,
  'user_id': number,
}

// post a new to do
app.post('/to-do/new', async (req, res) => {
  try {
    const querySnapshot = await db.collection(collectionName).get();
    const list: any[] = [];
    var errorFlag = false;
    querySnapshot.forEach(
      (toDo) => {
        if (errorFlag) {
          return;
        }
        const data = toDo.data();
        if (data.user_id === req.body['user_id']) {
          if (data.order == req.body['order']) {
            res.status(500).json({
              "status": "failed",
              "msg": "Cannot create a new to do: order already existed",
            });
            errorFlag = true;
            return;
          }
          list.push({
            "id": toDo.id,
            "note": data.note,
            "status": data.status,
            "order": data.order,
          });
        }
      }
    );
    if (errorFlag) {
      return;
    }
    if (+req.body['order'] != list.length + 1) {
      res.status(500).json({
        "status": "failed",
        "msg": `Cannot create a new to do: invalid order`,
      });
      return;
    }
    if (!(["to-do", "on-going", "finished"].includes(req.body['status']))) {
      res.status(500).json({
        "status": "failed",
        "msg": `Cannot create a new to do: invalid status`,
      });
      return;
    }
    const toDo: ToDo = {
      'note': req.body['note'],
      'status': req.body['status'],
      'order': +req.body['order'],
      'user_id': req.body['user_id'],
    };
    const newDoc = await db.collection(collectionName).add(toDo);
    res.status(200).json({
      "status": "success",
      "msg": `Created a new to do: ${newDoc.id}`,
      "id": newDoc.id,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot create a new to do",
    });
  }
});

// read all to do
app.post('/to-do', async (req, res) => {
  const userId = req.body['user_id'];
  try {
    const querySnapshot = await db.collection(collectionName).get();
    const list: any[] = [];
    querySnapshot.forEach(
      (toDo) => {
        const data = toDo.data();
        if (data.user_id === userId) {
          list.push({
            "id": toDo.id,
            "note": data.note,
            "status": data.status,
            "order": data.order,
          });
        }
      }
    );
    list.sort((a, b) => a.order - b.order);
    res.status(200).json({
      "to_do_list": list,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot get a to do list",
    });
  }
});

// delete a to do
app.delete('/to-do', async (req, res) => {
  var record_id = req.body['id'];
  var toBeDeletedDataOrder: any = null;
  try {
    const querySnapshot = await db.collection(collectionName).get();
    querySnapshot.forEach(
      (toDo) => {
        if (toDo.id == record_id) {
          const data = toDo.data();
          toBeDeletedDataOrder = data.order;
        }
      }
    )
    if (toBeDeletedDataOrder == null) {
      res.status(500).json({
        "status": "failed",
        "msg": "Cannot delete a to do: invalid id",
      });
      return;
    }
    querySnapshot.forEach(
      (toDo) => {
        const data = toDo.data();
        if (data.order > toBeDeletedDataOrder) {
          db.collection(collectionName).doc(toDo.id).set({ 'order': data.order - 1 }, { merge: true });
        }
      }
    )
    db.collection(collectionName).doc(record_id).delete()
      .then(() => res.status(200).json({
        "status": "success",
        "msg": `Deleted a to do: ${record_id}`,
        "id": record_id,
      }))
      .catch((error) => res.status(500).json({
        "status": "failed",
        "msg": `Cannot delete a to do: ${error}`,
        "description": error,
      }));
  } catch (error) {
    res.status(501).json({
      "status": "failed",
      "msg": `Cannot delete a to do: ${error}`,
      "description": error,
    });
  }
});

// update to do
app.put('/to-do', async (req, res) => {
  var record_id = req.body['id'];
  delete req.body['id'];
  if ("order" in req.body) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot update a to do: order cannot be directly updated",
    });
    return;
  }
  if ("status" in req.body && !(["to-do", "on-going", "finished"].includes(req.body['status']))) {
    res.status(500).json({
      "status": "failed",
      "msg": `Cannot update a to do: invalid status`,
    });
    return;
  }
  var toBeEditedData: any = null;
  const querySnapshot = await db.collection(collectionName).get();
  querySnapshot.forEach(
    (toDo) => {
      if (toDo.id == record_id) {
        toBeEditedData = toDo.data();
      }
    }
  )
  if (toBeEditedData == null) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot edit a to do: invalid id",
    });
    return;
  }
  await db.collection(collectionName).doc(record_id).set(req.body, { merge: true })
    .then(() => res.status(200).json({
      "status": "success",
      "msg": `Updated a to do: ${record_id}`,
      "id": record_id,
    }))
    .catch((error) => res.status(500).json({
      "status": "failed",
      "msg": `Cannot update a to do: ${error}`,
    }));
});

// move up a to do
app.post('/to-do/up', async (req, res) => {
  const toMoveUpId = req.body['id'];
  let toMoveUp: any = null;
  let toMoveDown: any = null;
  try {
    const querySnapshot = await db.collection(collectionName).get();
    querySnapshot.forEach(
      (toDo) => {
        if (toDo.id === toMoveUpId) {
          toMoveUp = toDo;
          return;
        }
      }
    );
    const toMoveUpData = toMoveUp.data();
    querySnapshot.forEach(
      (toDo) => {
        const data = toDo.data();
        if (data.order == toMoveUpData.order - 1) {
          toMoveDown = toDo;
          return;
        }
      }
    );
    const toMoveDownData = toMoveDown.data();
    if (toMoveUp === null || toMoveDown === null) {
      res.status(501).json({
        "status": "failed",
        "msg": `Cannot update to dos: invalid to do id (${toMoveUpData} and ${toMoveDownData})`,
      });
      return;
    } else {
      toMoveUpData.order -= 1;
      toMoveDownData.order += 1;
      await db.collection(collectionName).doc(toMoveUp.id).set(toMoveUpData, { merge: true });
      await db.collection(collectionName).doc(toMoveDown.id).set(toMoveDownData, { merge: true });
      res.status(200).json({
        "status": "success",
        "msg": `Updated to dos: ${toMoveUp.id} and ${toMoveDown.id}`,
        "id": req.body['id'],
      });
    }
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": `Cannot update to dos: ${error} (${toMoveUp} and ${toMoveDown})`,
    });
  }
});

// move down a to do
app.post('/to-do/down', async (req, res) => {
  const toMoveDownId = req.body['id'];
  let toMoveUp: any = null;
  let toMoveDown: any = null;
  try {
    const querySnapshot = await db.collection(collectionName).get();
    querySnapshot.forEach(
      (toDo) => {
        if (toDo.id === toMoveDownId) {
          toMoveDown = toDo;
          return;
        }
      }
    );
    const toMoveDownData = toMoveDown.data();
    querySnapshot.forEach(
      (toDo) => {
        const data = toDo.data();
        if (data.order == toMoveDownData.order + 1) {
          toMoveUp = toDo;
          return;
        }
      }
    );
    const toMoveUpData = toMoveUp.data();
    if (toMoveUp === null || toMoveDown === null) {
      res.status(501).json({
        "status": "failed",
        "msg": `Cannot update to dos: invalid to do id (${toMoveUpData} and ${toMoveDownData})`,
      });
      return;
    } else {
      toMoveUpData.order -= 1;
      toMoveDownData.order += 1;
      await db.collection(collectionName).doc(toMoveUp.id).set(toMoveUpData, { merge: true });
      await db.collection(collectionName).doc(toMoveDown.id).set(toMoveDownData, { merge: true });
      res.status(200).json({
        "status": "success",
        "msg": `Updated to dos: ${toMoveUp.id} and ${toMoveDown.id}`,
        "id": req.body['id'],
      });
    }
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": `Cannot update to dos: ${error} (${toMoveUp} and ${toMoveDown})`,
    });
  }
});
