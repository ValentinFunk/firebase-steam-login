import { VERSION } from "./../version";
import * as admin from "firebase-admin";
import * as morgan from "morgan";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as compression from "compression";
import * as errorHandler from "errorhandler";
import * as querystring from "querystring";
import { Passport } from "passport";
import * as cors from "cors";
import expressValidator = require("express-validator");
import DiscordStrategy = require("passport-discord");
import SteamStrategy = require("passport-steam");
import { asyncRequestRedirectOnError } from "./utils";
import { User } from "./user.model";
import { handleSteamLogin } from "./steam-controller";
import { Config } from "./../config/config";
import { JwtController } from "./jwt-controller";
import { DiscordController } from "./discord-controller";

function regenerateSession(req: express.Request, res: express.Response, done: express.NextFunction) {
  req.session.regenerate(done);
}

export class App {
  private passport = new Passport();

  private discordController: DiscordController;
  private jwtController: JwtController;

  constructor(private config: Config, private app: express.Application) {
    this.discordController = new DiscordController(this.config);
    this.app.use(cors({
      origin: config.corsOrigins,
      methods: ["GET", "POST"],
      preflightContinue: true
    }));

    this.app.set("port", process.env.PORT || 3000);
    this.app.use(compression());
    this.app.use(bodyParser.json());
    this.app.use(expressValidator());

    this.setupPassport();
    this.app.use(this.passport.initialize());

    const logger = morgan(this.app.get("env") == "development" ? "dev" : "common");
    this.app.use(logger);

    /**
     * Error Handler. Provides full stack - remove for production
     */
    if (this.app.get("env") == "development") {
      this.app.use(errorHandler());
    }

    this.setupSteamRoutes();
    this.setupDiscordRoutes();
    this.setupJwtRoutes();
    this.setupBaseRoutes();
  }

  private setupPassport() {
    const config = this.config;
    const passport = this.passport;

    passport.use(new SteamStrategy({
      returnURL: config.rootUrl + "/auth/steam/callback",
      realm: config.rootUrl,
      apiKey: config.steamApiKey
    }, (identity, profile, done) => {
      handleSteamLogin(identity, profile).then(
        user => done(undefined, user),
        error => done(error, undefined)
      );
    }));

    passport.use(new DiscordStrategy({
      clientID: config.discord.clientId,
      clientSecret: config.discord.clientSecret,
      scope: ["identify", "email", "guilds.join", "guilds"],
      callbackURL: config.rootUrl + "/auth/discord/callback"
    }, (accessToken, refreshToken, profile, done) => {
      done(undefined, {
        discordProfile: profile,
        accessToken,
        refreshToken
      });
    }));

    passport.serializeUser(function (user, done) {
      done(undefined, user);
    });

    passport.deserializeUser(function (user, done) {
      done(undefined, user);
    });

    return passport;
  }

  /**
   * Express controller function that redirects the user back to the auth requesting
   * application with a firebase Token. Called at the end of the authentication chain.
   */
  private redirectWithToken = asyncRequestRedirectOnError.bind(undefined,
    async (req: express.Request, res: express.Response) => {
      const user = req.user as User;
      // This should never happen as we're in an oauth callback
      if (!user) {
        throw new Error("Invalid user - not logged in?");
      }

      const redirectUrl = this.config.clients[req.session.client_id];
      if (!redirectUrl) {
        throw new Error("Invalid Session: Invalid client_id");
      }

      const provider = req.session.provider;
      if (!provider) {
        throw new Error("Invalid Session: Invalid provider.");
      }

      const query: any = {
        provider
      };

      if (provider == "steam") {
        // Create a firebase auth token and redirect the user
        const token = await admin.auth().createCustomToken(user.uid);
        query.token = token;
      } else if (provider == "discord") {
        // We don't pass the token here as it's in the firebase db and should be
        // fetched there by the app.
      } else {
        throw new Error("Unhandled provider " + provider);
      }

      const queryStr = querystring.stringify(query);
      res.redirect(`${redirectUrl}?${queryStr}`);
    }
  );

  private setupSteamRoutes() {
    /**
     * Primary Authentication: Steam
     */
    this.app.get("/auth/steam",
      regenerateSession,
      (req, res, done) => {
        if (!req.query.client_id || !this.config.clients[req.query.client_id]) {
          res.status(400).send("Invalid client id");
          return;
        }

        req.session.client_id = req.query.client_id;
        req.session.provider = "steam";

        done();
      },
      this.passport.authenticate("steam", { failureRedirect: "/fail" })
    );

    this.app.get("/auth/steam/callback",
      this.passport.authenticate("steam", { failureRedirect: "/fail" }),
      (req, res) => this.redirectWithToken(req, res)
    );
  }

  private setupDiscordRoutes() {
    /**
     * Secondary Authentication to link a discord acc to steam.
     * Requires query params:
     *
     * @apiParam {String} client_id   The client_id for this request.
     * @apiParam {String} id_token    The firebase id token of the signed in user.
     */
    this.app.get("/auth/discord",
      regenerateSession,
      (req, res, done) => { // validate and login before redirect
        // Validate client_id
        if (!req.query.client_id || !this.config.clients[req.query.client_id]) {
          res.status(400).send("Missing or invalid client_id");
          return;
        }
        req.session.client_id = req.query.client_id;
        req.session.provider = "discord";

        // Validate auth_token
        if (!req.query.id_token) {
          res.status(403).send("Missing id_token");
          return;
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
      this.passport.authenticate("discord", { failureRedirect: "/fail" }),
    );

    this.app.get("/auth/discord/callback",
      this.passport.authenticate("discord", { failureRedirect: "/fail" }),
      (req, res, done) => this.discordController.handleDiscordLogin(req, res, done),
      (req, res) => this.redirectWithToken(req, res)
    );
  }

  private setupJwtRoutes() {
    this.app.get("/jwt-public", (req, res) => this.jwtController.getJwtPublicKey(req, res));
    this.app.post("/longlived-token", (req, res) => this.jwtController.generateLonglivedToken(req, res));
  }

  private setupBaseRoutes() {
    this.app.get("/fail", (req, res) => {
      console.log("OAuth login failed - /fail callback called.");
      const redirectUrl = this.config.clients[req.session.client_id];
      res.redirect(`${redirectUrl}?code=oauth_fail`);
    });


    this.app.get("/healthz", (_, res) => {
      res.status(200).send("OK");
    });

    this.app.get("/version", (_, res) => {
      res.status(200).json({ version: VERSION });
    });
  }
}
