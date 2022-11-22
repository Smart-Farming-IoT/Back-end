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
export const app = express();
const main = express();

// line channel access token
// export const TOKEN = ""

// AIS magellan token
// var aisToken = ""
  
// enable all cors requests
main.use(cors());

// add the path to receive request
main.use('/api/v1', app);

// set json as body parser
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({extended: false}));

// initialize the database
export const db = admin.firestore();

// define google cloud function name
export const webApi = functions.https.onRequest(main);

// post a debug
app.post('/debug', async (req, res) => {
  try {
    const newDoc = await db.collection('debug').add(req.body)
    res.status(200).json({
      "status": "success",
      "msg": "Debug DONE!",
      "id": newDoc.id,
    });
  } catch (error) {
    res.status(500).json({
      "status": "failed",
      "msg": `Cannot create a user linker: ${error}`,
    });
  }
});

