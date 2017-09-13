import { SteamProfileResult } from "./../types/ISteamProfileResults";
import { User } from "./user.model";
import * as admin from "firebase-admin";

// tslint:disable-next-line:max-line-length
const unknownUrl = "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg";
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
  const profileQuery = admin.database()
    .ref("profiles")
    .orderByChild("steam/steamid")
    .equalTo(steamProfile.id.toString());

  const firebaseProfiles = (await profileQuery.once("value")).val();
  let existingUserId: string;
  if (firebaseProfiles && Object.keys(firebaseProfiles).length > 0) {
    existingUserId = Object.keys(firebaseProfiles)[0];
  }
  let firebaseUser = existingUserId && await admin.auth().getUser(existingUserId);

  if (!firebaseUser) {
    firebaseUser = await admin.auth().createUser({
      emailVerified: false,
      email: steamProfile.id + "@steamcommunity.com",
      displayName: steamProfile.displayName,
      photoURL: steamProfile.photos[2].value,
      disabled: false
    });
  } else {
    // On Login update name and avatar
    firebaseUser = await admin.auth().updateUser(existingUserId, {
      displayName: steamProfile.displayName,
      photoURL: steamProfile.photos[2].value,
    });
  }

  await admin.app().database().ref(`profiles/${firebaseUser.uid}`).update({
    displayName: steamProfile.displayName,
    photoURL: (steamProfile.photos && steamProfile.photos[2] && steamProfile.photos[2].value) || unknownUrl,
    steam: steamProfile._json
  });

  const userProfile = await admin.app().database().ref(`profiles/${firebaseUser.uid}`).once("value");
  return Object.assign({}, userProfile, firebaseUser);
}