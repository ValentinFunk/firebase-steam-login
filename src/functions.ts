import "core-js/fn/object/entries";
import "core-js/fn/object/values";
import "core-js/fn/object/keys";

import { config } from "./config/from-firebase";
import * as functions from "firebase-functions";
import { App } from "./api/app";
import * as admin from "firebase-admin";
import * as session from "express-session";
import * as firebaseStore from "connect-session-firebase";
import * as express from "express";
import { changeKeyCase } from "./util/change-key-case";

const firebaseServiceAcc = changeKeyCase(functions.config()["steam-login"].firebase, "snake");
admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAcc),
  databaseURL: `https://${firebaseServiceAcc.project_id}.firebaseio.com`
});
const FirebaseStore = firebaseStore(session);
const store = new FirebaseStore({
  database: admin.database()
});

const app = express();
app.use(session({
  store,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true,
  name: "__session"
}));
new App(config, app);

/**
 * Makes it possible to run as firebase function
 */
export let firebaseSteamLogin = functions.https.onRequest((request, response) => {
  if (!request.path) {
    request.url = `/${request.url}`; // prepend '/' to keep query params if any
  }

  // Clear expired sessions
  store.reap(() => {});

  // Handle logic
  app(request, response);
}) as any;