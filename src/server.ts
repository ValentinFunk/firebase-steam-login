import { handleSteamLogin } from "./controller";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as compression from "compression";
import * as errorHandler from "errorhandler";
import expressValidator = require("express-validator");
import * as admin from "firebase-admin";
import * as logger from "morgan";
import SteamStrategy = require("passport-steam");
import * as path from "path";
import * as passport from "passport";
import * as session from "express-session";
import * as config from "./config";

admin.initializeApp({
  credential: admin.credential.cert(config.firebaseCert),
  databaseURL: config.firebaseDbUrl
});

/**
 * Create Express server.
 */
const app = express();

app.use(session({
  secret: "steamfbauthsecret123!"
}));

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
  returnURL: config.rootUrl + "/auth/steam/callback",
  realm: config.realm,
  apiKey: config.steamApiKey
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

app.get("/auth/steam", (req, res, done) => {
  if (!req.query.client_id || !config.validClients[req.query.client_id]) {
    res.status(400).send("Invalid client id");
    done("Invalid client id: " + (req.query.client_id || "none given"));
  }
  req.session.client_id = req.query.client_id;
  done();
}, passport.authenticate("steam", { failureRedirect: "/fail" }));
app.get("/auth/steam/callback", passport.authenticate("steam", { failureRedirect: "/fail" }), handleSteamLogin);
app.get("/fail", (req, res) => {
  console.error(req.query);
  res.redirect(config.validClients[req.session.client_id] + "?code=oauth_fail");
});

app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));

/**
 * Start Express server.
 */
app.listen(app.get("port"), () => {
  console.log(("  App is running at http://localhost:%d in %s mode"), app.get("port"), app.get("env"));
  console.log("  Press CTRL-C to stop\n");
});

module.exports = app;