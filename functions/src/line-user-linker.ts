/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */

// import libraries
import { app, db } from './main';

// initialize the collection
const collectionName = 'line-user-linker';

interface line_user_linker {
  'firebase_user_id': string,
  'line_user_id': string,
  'timeout': number,
}

// post a new linker
app.post('/line-user-linker/new', async (req, res) => {
  const userId = req.body['user_id'];
  const force = req.body['force'];
  try {
    const querySnapshot = await db.collection(collectionName).get();
    var errorFlag = false;
    var linkerFoundFlag = false;
    querySnapshot.forEach(
      (linker) => {
        if (errorFlag || linkerFoundFlag) {
          return;
        }
        const data = linker.data();
        if (data.firebase_user_id == userId) {
          if (!force && data.line_user_id != '') {
            res.status(500).json({
              "status": "failed",
              "msg": "User is already linked",
            });
            errorFlag = true;
            return;
          }
          else {
            db.collection(collectionName).doc(linker.id).delete()
              .catch((error) => res.status(500).json({
                "status": "failed",
                "msg": `Cannot delete a user linker: ${error}`,
                "description": error,
              }));
              linkerFoundFlag = true;
            return;
          }
        }
      }
    );
    if (errorFlag) {
      return;
    }

    const lineUserLinker: line_user_linker = {
      'firebase_user_id': userId,
      'line_user_id': '',
      'timeout': Date.now() + 5 * 60000,  // token valid for 5 minutes
    };
    const newDoc = await db.collection(collectionName).add(lineUserLinker);
    res.status(200).json({
      "status": "success",
      "msg": `Created a user linker: ${newDoc.id}`,
      "id": newDoc.id,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": `Cannot create a user linker: ${error}`,
    });
  }
});


// get a new linker
app.post('/line-user-linker', async (req, res) => {
  const userId = req.body['user_id'];
  try {
    const querySnapshot = await db.collection(collectionName).get();
    var userFoundFlag = false;
    querySnapshot.forEach(
      (linker) => {
        if (userFoundFlag) {
          return;
        }
        const data = linker.data();
        if (data.firebase_user_id == userId) {
          res.status(200).json({
            "id": linker.id,
            "firebase_user_id": data.firebase_user_id,
            "line_user_id": data.line_user_id,
            "timeout": data.timeout,
            "msg": "success"
          });
          userFoundFlag = true;
          return;
        }
      }
    );
    if (!userFoundFlag) {
      res.status(200).json({
        "msg": "linker not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": `Cannot create a user linker: ${error}`,
    });
  }
});
