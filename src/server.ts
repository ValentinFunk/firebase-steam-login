import { EnvConfig } from "./config/from-env";
import { App } from "./api/app";
import * as admin from "firebase-admin";
import * as session from "express-session";

const firebaseApp = admin.initializeApp(EnvConfig.firebaseConfig);

const app = new App(EnvConfig).app;
this.app.use(session({
  secret: EnvConfig.sessionSecret,
  name: "__session"
}));
app.set("port", process.env.PORT || 8080);

/**
 * Start Express server.
 */
app.listen(app.get("port"), () => {
  console.log(("  App is running at http://localhost:%d in %s mode"), app.get("port"), app.get("env"));
  console.log("  Firebase: " + firebaseApp.options.databaseURL);
  console.log("  Press CTRL-C to stop\n");
});