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
