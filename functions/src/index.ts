/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */

// import libraries
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';

// initialize firebase
admin.initializeApp(functions.config().firebase);

// initialize express server
const app = express();
const main = express();

// enable all cors requests
main.use(cors());

// add the path to receive request
main.use('/api/v1', app);

// set json as body parser
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({extended: false}));

// initialize the database and the collection
const db = admin.firestore();
const toDoCollection = 'to_do';

// define google cloud function name
export const webApi = functions.https.onRequest(main);

interface ToDo{
  'note': string,
  'status': string,
  'order': number,
  'user_id': number,
}

// post a new to do
app.post('/to-do', async (req, res) => {
  try {
    const toDo: ToDo = {
      'note': req.body['note'],
      'status': req.body['status'],
      'order': +req.body['order'],
      'user_id': req.body['user_id'],
    };
    const newDoc = await db.collection(toDoCollection).add(toDo);
    res.status(200).json({
      "status": "success",
      "msg": `Created a new to do: ${newDoc.id}`,
      "id": newDoc.id,
    });
  } catch (error) {
    res.status(200).json({
      "status": "success",
      "msg": "Cannot create a new to do",
    });
  }
});

// get all to do
app.get('/to-do/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const toDoQuerySnapshot = await db.collection(toDoCollection).get();
    const toDoList: any[] = [];
    toDoQuerySnapshot.forEach(
        (toDo) => {
          const data = toDo.data();
          if (data.user_id === userId) {
            toDoList.push({
              "id": toDo.id,
              "note": data.note,
              "status": data.status,
              "order": data.order,
            });
          }
        }
    );
    toDoList.sort((a, b) => a.order - b.order);
    res.status(200).json({
      "to_do_list": toDoList,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": "Cannot get a to do list",
    });
  }
});

// delete a to do
app.delete('/to-do/:id', async (req, res) => {
  var toBeDeletedDataOrder: any = null;
  try {
    const toDoQuerySnapshot = await db.collection(toDoCollection).get();
    toDoQuerySnapshot.forEach(
      (toDo) => {
        if (toDo.id == req.params.id) {
          const data = toDo.data();
          toBeDeletedDataOrder = data.order
        }
      }
    )
    toDoQuerySnapshot.forEach(
      (toDo) => {
        const data = toDo.data();
        if (data.order > toBeDeletedDataOrder) {
          db.collection(toDoCollection).doc(toDo.id).set({'order': data.order-1}, {merge: true});
        }
      }
    )
    db.collection(toDoCollection).doc(req.params.id).delete()
      .then(() => res.status(200).json({
        "status": "success",
        "msg": `Deleted a to do: ${req.params.id}`,
        "id": req.params.id,
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
app.put('/to-do/:id', async (req, res) => {
  await db.collection(toDoCollection).doc(req.params.id).set(req.body, {merge: true})
      .then(() => res.status(200).json({
        "status": "success",
        "msg": `Updated a to do: ${req.params.id}`,
        "id": req.params.id,
      }))
      .catch((error) => res.status(500).json({
        "status": "failed",
        "msg": `Cannot update a to do: ${error}`,
      }));
});

// move up a to do
app.post('/to-do/up/:id', async (req, res) => {
  const toMoveUpId = req.params.id;
  let toMoveUp: any = null;
  let toMoveDown: any = null;
  try {
    const toDoQuerySnapshot = await db.collection(toDoCollection).get();
    toDoQuerySnapshot.forEach(
        (toDo) => {
          if (toDo.id === toMoveUpId) {
            toMoveUp = toDo;
            return;
          }
        }
    );
    const toMoveUpData = toMoveUp.data();
    toDoQuerySnapshot.forEach(
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
      await db.collection(toDoCollection).doc(toMoveUp.id).set(toMoveUpData, {merge: true});
      await db.collection(toDoCollection).doc(toMoveDown.id).set(toMoveDownData, {merge: true});
      res.status(200).json({
        "status": "success",
        "msg": `Updated to dos: ${toMoveUp.id} and ${toMoveDown.id}`,
        "id": req.params.id,
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
app.post('/to-do/down/:id', async (req, res) => {
  const toMoveDownId = req.params.id;
  let toMoveUp: any = null;
  let toMoveDown: any = null;
  try {
    const toDoQuerySnapshot = await db.collection(toDoCollection).get();
    toDoQuerySnapshot.forEach(
        (toDo) => {
          if (toDo.id === toMoveDownId) {
            toMoveDown = toDo;
            return;
          }
        }
    );
    const toMoveDownData = toMoveDown.data();
    toDoQuerySnapshot.forEach(
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
      await db.collection(toDoCollection).doc(toMoveUp.id).set(toMoveUpData, {merge: true});
      await db.collection(toDoCollection).doc(toMoveDown.id).set(toMoveDownData, {merge: true});
      res.status(200).json({
        "status": "success",
        "msg": `Updated to dos: ${toMoveUp.id} and ${toMoveDown.id}`,
        "id": req.params.id,
      });
    }
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": `Cannot update to dos: ${error} (${toMoveUp} and ${toMoveDown})`,
    });
  }
});
