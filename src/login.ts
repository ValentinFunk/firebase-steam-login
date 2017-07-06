import * as express from "express";
import * as admin from "firebase-admin";
import * as querystring from "querystring";
import { validClients } from "./config";
import { SteamProfileResult } from "./types/ISteamProfileResults";
import { AlreadyLinkedError, User } from "./user.model";

/**
 * Wrapper function that makes an async function usable as express controller.
 * Redirects the user back to the session return URL that was set when initing the
 * auth request.
 *
 * example: ```
 *  async function(req, res) => {
 *    throw new Error();
 *  }
 *  app.get('/route', asyncRequest.bind(undefined, functionThatErrors));
 * ```
 * @param asyncFn the function to wrap (should be bound)
 * @param req express request
 * @param res express response
 */
function asyncRequest(asyncFn: express.RequestHandler, req: express.Request, res: express.Response) {
  asyncFn(req, res, undefined).catch((e: any) => {
    if (validClients[req.session.client_id]) {
      const code = e.code ? e.code : "unknown";
      res.redirect(validClients[req.session.client_id] + "?code=" + code);
    } else {
      console.error(e);
      res.status(500).write("Error logging in");
    }
  });
}

/**
 * Function to be passsed to the SteamStrategy. Creates the firebase user
 * if it doesn't exists and updates name and profile image to match steam's.
 *
 * Resolves
 *
 * @param accessToken
 * @param profile
 */
export async function handleSteamLogin(accessToken: string, steamProfile: SteamProfileResult): Promise<User> {
  let firebaseUser: admin.auth.UserRecord;
  try {
    firebaseUser = await admin.auth().getUser(steamProfile.id.toString());
  } catch (e) {
    if (!e.code || e.code != "auth/user-not-found") {
      throw e;
    }
  }

  if (!firebaseUser) {
    firebaseUser = await admin.auth().createUser({
      emailVerified: false,
      displayName: steamProfile.displayName,
      photoURL: steamProfile.photos[2].value,
      disabled: false
    });
  } else {
    // On Login update name and avatar
    firebaseUser = await admin.auth().updateUser(steamProfile.id.toString(), {
      displayName: steamProfile.displayName,
      photoURL: steamProfile.photos[2]
    });
  }

  await admin.app().database().ref(`profiles/${firebaseUser.uid}`).update({
    steam: steamProfile._json
  });

  const userProfile = await admin.app().database().ref(`profiles/${firebaseUser.uid}`).once("value");
  return Object.assign({}, userProfile, firebaseUser);
}

/**
 * Function called after a Firebase Authenticated user (stored in session.userId)
 * has logged in to link their Discord account. Stores the discord profile into the
 * user's profile and returns the user.
 */
export async function handleDiscordLogin(req: express.Request, res: express.Response, done: express.NextFunction): Promise<User> {
  const userId = req.session.userId;
  if (!userId) {
    throw new Error("Invalid Session: userId missing");
  }

  const firebaseUser = await admin.auth().getUser(userId);
  if (!firebaseUser) {
    throw new Error("Invalid Firebase User in Session id:" + userId);
  }

  let userProfile = await admin.app().database().ref(`profiles/${userId}`).once("value");
  if (!userProfile) {
    throw new Error(`User ${userId} has no profile!`);
  }
  if (userProfile.discord && userProfile.discord.id != req.user.discordProfile.id) {
    throw new AlreadyLinkedError();
  }

  await Promise.all([
    admin.app().database().ref(`profiles/${userId}`).update({
      discord: req.user.discordProfile
    }),
    admin.app().database().ref(`tokens/${userId}`).update({
      discord: {
        accessToken: req.user.accessToken,
        refreshToken: req.user.refreshToken
      }
    })
  ]);

  // Return updated profile
  userProfile = await admin.app().database().ref(`profiles/${firebaseUser.uid}`).once("value");
  return Object.assign({}, userProfile, firebaseUser);
}

/**
 * Express controller function that redirects the user back to the auth requesting
 * application with a firebase Token. Called at the end of the authentication chain.
 */
export const redirectWithToken = asyncRequest.bind(undefined,
  async function redirectWithToken(req: express.Request, res: express.Response) {
    const user = req.user as User;
    // This should never happen as we're in an oauth callback
    if (!user) {
      throw new Error("Invalid user - not logged in?");
    }

    const redirectUrl = validClients[req.session.client_id];
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