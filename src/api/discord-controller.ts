import { Config } from "../config/config";
import { StoredToken, OAuthTokenResponse } from "../types/OAuthToken.d";
import * as express from "express";
import * as admin from "firebase-admin";
import * as querystring from "querystring";
import { AlreadyLinkedError } from "./user.model";
import { asyncMiddleware } from "./utils";
import * as request from "request-promise";

export class DiscordController {
  constructor(private config: Config) { }

  /**
   * Gets a discord auth token form a refresh token containing properties such as
   * expiration and scope.
   * @param refreshToken refresh token
   */
  async getDiscordTokenFromRefreshToken(refreshToken: string): Promise<StoredToken> {
    const body = querystring.stringify({
      refresh_token: refreshToken,
      client_id: this.config.discord.clientId,
      client_secret: this.config.discord.clientSecret,
      grant_type: "refresh_token"
    });

    return await Promise.resolve(request.post("https://discordapp.com/api/oauth2/token", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": body.length
      },
      body,
      json: true
    }).then((token: OAuthTokenResponse): StoredToken => {
      return {
        access_token: token.access_token,
        expires: new Date().getTime() + token.expires_in,
        refresh_token: refreshToken,
        token_type: token.token_type,
        scope: token.scope
      };
    }));
  }

  /**
   * Function called after a Firebase Authenticated user (stored in session.userId)
   * has logged in to link their Discord account. Stores the discord profile into the
   * user's profile and returns the user.
   */
  handleDiscordLogin = asyncMiddleware.bind(undefined,
    async (req: express.Request) => {
      const userId = req.session.userId;
      if (!userId) {
        throw new Error("Invalid Session: userId missing");
      }

      const firebaseUser = await admin.auth().getUser(userId);
      if (!firebaseUser) {
        throw new Error("Invalid Firebase User in Session id:" + userId);
      }

      const userProfile = await admin.app().database().ref(`profiles/${userId}`).once("value");
      if (!userProfile) {
        throw new Error(`User ${userId} has no profile!`);
      }
      if (userProfile.discord && userProfile.discord.id != req.user.discordProfile.id) {
        throw new AlreadyLinkedError();
      }

      // Get extended token info and store all info into the database
      await Promise.all([
        admin.app().database().ref(`profiles/${userId}`).update({
          discord: req.user.discordProfile
        }),
        admin.app().database().ref(`tokens/${userId}`).update({
          discord: await this.getDiscordTokenFromRefreshToken(req.user.refreshToken)
        })
      ]);
    }
  );
}
