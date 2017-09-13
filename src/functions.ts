import "core-js/fn/object/entries";
import "core-js/fn/object/values";
import "core-js/fn/object/keys";

import { config } from "./config/from-firebase";
import * as functions from "firebase-functions";
import { App } from "./api/app";
import * as admin from "firebase-admin";

admin.initializeApp(functions.config().firebase);
const app = new App(config).app;

/**
 * Makes it possible to run as firebase function
 */
export let firebaseSteamLogin = functions.https.onRequest((request, response) => {
  if (!request.path) {
    request.url = `/${request.url}`; // prepend '/' to keep query params if any
  }

  return app(request, response);
}) as any;