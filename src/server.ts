import { handleSteamLogin } from "./controller";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as compression from "compression";
import * as dotenv from "dotenv";
import * as errorHandler from "errorhandler";
import expressValidator = require("express-validator");
import * as admin from "firebase-admin";
import * as logger from "morgan";
import SteamStrategy = require("passport-steam");
import * as path from "path";
import * as passport from "passport";
/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: ".env.example" });

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACC)),
  databaseURL: process.env.FIREBASE_DB_URL
});

/**
 * Create Express server.
 */
const app = express();

/**
 * Passport configuration.
 */

passport.serializeUser(function(user, done) {
  done(undefined, user);
});

passport.deserializeUser(function(user, done) {
  done(undefined, user);
});

passport.use(new SteamStrategy({
  returnURL: process.env.ROOT_URL + "/auth/steam/callback",
  realm: process.env.REALM,
  apiKey: process.env.STEAM_API_KEY
}, (identifier, profile, done) => {
    done(undefined, profile);
  }
));

/**
 * Express configuration.
 */
app.set("port", process.env.PORT || 3000);
app.use(compression());
app.use(bodyParser.json());
app.use(expressValidator());
app.use(passport.initialize());

app.use(logger(app.get("env") == "development" ? "dev" : "common"));

/**
 * Error Handler. Provides full stack - remove for production
 */
if (app.get("env") == "development") {
  app.use(errorHandler());
}

// wrapper that catches all errors and sends them as 500 response using express
function asyncRequest(asyncFn: express.RequestHandler, req: express.Request, res: express.Response) {
  asyncFn(req, res, undefined).catch((e: Error) => res.status(500).json({ message: e.message }));
}

app.get("/auth/steam", passport.authenticate("steam", { failureRedirect: "/fail" }));
app.get("/auth/steam/callback", passport.authenticate("steam", { failureRedirect: "/fail" }), asyncRequest.bind(undefined, handleSteamLogin));

app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));

/**
 * Start Express server.
 */
app.listen(app.get("port"), () => {
  console.log(("  App is running at http://localhost:%d in %s mode"), app.get("port"), app.get("env"));
  console.log("  Press CTRL-C to stop\n");
});

module.exports = app;