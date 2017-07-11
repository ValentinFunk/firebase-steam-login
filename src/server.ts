import * as admin from "firebase-admin";
import * as logger from "morgan";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as compression from "compression";
import * as errorHandler from "errorhandler";
import * as session from "express-session";
import * as passport from "passport";
import * as cors from "cors";
import expressValidator = require("express-validator");
import DiscordStrategy = require("passport-discord");
import SteamStrategy = require("passport-steam");
import * as config from "./config";
import { handleSteamLogin, redirectWithToken, handleDiscordLogin, getJwtPublicKey, generateLonglivedToken } from "./login";
import *  as url from "url";

admin.initializeApp({
  credential: admin.credential.cert(config.firebaseCert),
  databaseURL: config.firebaseDbUrl
});

/**
 * Create Express server.
 */
const app = express();

app.use(session({
  secret: config.sessionSecret,
}));

const validOrigins = Object.values(config.validClients)
  .map(returnUrl => {
    const parsed = url.parse(returnUrl);
    return parsed.protocol + "//" + parsed.hostname + ":" + parsed.port;
  });

app.use(cors({
  origin: validOrigins,
  methods: ["GET", "POST"],
  preflightContinue: true
}));
console.log(validOrigins);

/**
 * Passport configuration.
 */

passport.serializeUser(function (user, done) {
  done(undefined, user);
});

passport.deserializeUser(function (user, done) {
  done(undefined, user);
});

function regenerateSession(req: express.Request, res: express.Response, done: express.NextFunction) {
  req.session.regenerate(done);
}

/**
 * Steam is the primary authentication provider.
 */
passport.use(new SteamStrategy({
  returnURL: config.rootUrl + "/auth/steam/callback",
  realm: config.realm,
  apiKey: config.steamApiKey
}, (identity, profile, done) => {
  handleSteamLogin(identity, profile).then(user => done(undefined, user), error => done(error, undefined));
}));

/**
 * Discord can only be linked but not be used for login.
 */
passport.use(new DiscordStrategy({
  clientID: config.discordClientId,
  clientSecret: config.discordClientSecret,
  scope: ["identify", "email", "guilds.join"],
  callbackURL: config.rootUrl + "/auth/discord/callback"
}, (accessToken, refreshToken, profile, done) => {
  done(undefined, {
    discordProfile: profile,
    accessToken,
    refreshToken
  });
}));

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

app.get("/fail", (req, res) => {
  console.log("OAuth login failed - /fail callback called.");
  res.redirect(config.validClients[req.session.client_id] + "?code=oauth_fail");
});

/**
 * Primary Authentication: Steam
 */
app.get("/auth/steam",
  regenerateSession,
  function validateBeforeRedirect(req, res, done) {
    if (!req.query.client_id || !config.validClients[req.query.client_id]) {
      res.status(400).send("Invalid client id");
      done("Invalid client id: " + (req.query.client_id || "none given"));
    }
    req.session.client_id = req.query.client_id;
    req.session.provider = "steam";

    done();
  },
  passport.authenticate("steam", { failureRedirect: "/fail" })
);

app.get("/auth/steam/callback", passport.authenticate("steam", { failureRedirect: "/fail" }), redirectWithToken);

/**
 * Secondary Authentication to link a discord acc to steam.
 * Requires query params:
 *
 * @apiParam {String} client_id   The client_id for this request.
 * @apiParam {String} id_token    The firebase id token of the signed in user.
 */
app.get("/auth/discord",
  regenerateSession,
  function validateAndLoginBeforeRedirect(req, res, done) {
    // Validate client_id
    if (!req.query.client_id || !config.validClients[req.query.client_id]) {
      res.status(400).send("Missing or invalid client_id");
      done("Invalid client id: " + (req.query.client_id || "none given"));
    }
    req.session.client_id = req.query.client_id;
    req.session.provider = "discord";

    // Validate auth_token
    if (!req.query.id_token) {
      res.status(403).send("Missing id_token");
      done("Invalid client id: " + (req.query.client_id || "none given"));
    }

    admin.auth().verifyIdToken(req.query.id_token).then(value => {
      req.session.userId = value.uid;
      done();
    }, err => {
      console.error("Could not verify id_token");
      res.status(403).send("Invalid id_token");
      done(err);
    });
  },
  passport.authenticate("discord", { failureRedirect: "/fail" }),
);

app.get("/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/fail" }),
  handleDiscordLogin,
  redirectWithToken
);

app.get("/jwt-public", getJwtPublicKey);
app.post("/longlived-token", generateLonglivedToken);

/**
 * Start Express server.
 */
app.listen(app.get("port"), () => {
  console.log(("  App is running at http://localhost:%d in %s mode"), app.get("port"), app.get("env"));
  console.log("  Press CTRL-C to stop\n");
});

module.exports = app;
