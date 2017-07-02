import * as express from "express";
import * as admin from "firebase-admin";
import { SteamProfileResult } from "ISteamProfileResults";
import { validClients } from './config';

// Wrapper that catches all errors and redirects
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

async function _handleSteamLogin(req: express.Request, res: express.Response) {
    const user: SteamProfileResult = req.user;

    let fbUser;
    try {
        fbUser = await admin.auth().getUser(user.id.toString());
    } catch (e) {
        if (!e.code || e.code != "auth/user-not-found") {
            throw e;
        }
    }

    if (!fbUser) {
        fbUser = await admin.auth().createUser({
            emailVerified: false,
            displayName: user.displayName,
            photoURL: user.photos[2].value,
            disabled: false
        });
    } else {
        // On Login update name and avatar
        fbUser = await admin.auth().updateUser(user.id.toString(), {
            displayName: user.displayName,
            photoURL: user.photos[2]
        });
    }
    admin.app().database().ref(`profiles/${user.id}`).update({
        steam: user._json
    });

    const redirectUrl = validClients[req.session.client_id];
    if (!redirectUrl) {
        throw new Error("Invalid client id");
    }
    const token = await admin.auth().createCustomToken(fbUser.uid);
    res.redirect(redirectUrl + "?token=" + token);
}

export const handleSteamLogin = asyncRequest.bind(undefined, _handleSteamLogin);