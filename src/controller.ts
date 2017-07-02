import * as express from "express";
import * as admin from "firebase-admin";
import { SteamProfileResult } from "ISteamProfileResults";

export async function handleSteamLogin(req: express.Request, res: express.Response) {
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

    res.json({
        token: await admin.auth().createCustomToken(fbUser.uid)
    });
}