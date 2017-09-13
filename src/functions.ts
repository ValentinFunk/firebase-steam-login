import "core-js/fn/object/entries";
import "core-js/fn/object/values";
import "core-js/fn/object/keys";

import { config } from "./config/from-firebase";
import * as functions from "firebase-functions";
import { App } from "./api/app";
import * as admin from "firebase-admin";
import * as session from "express-session";
import * as firebaseStore from "connect-session-firebase";

admin.initializeApp(functions.config().firebase);
const app = new App(config).app;

const FirebaseStore = firebaseStore(session);
const store = new FirebaseStore({
  database: admin.database()
});
app.use(session({
  store,
  secret: config.sessionSecret,
  resave: true,
  saveUninitialized: true
}));

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