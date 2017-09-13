import * as admin from "firebase-admin";

export interface UserProfile {
  steam: any;
  discord: any;
}

export type User = admin.auth.UserRecord & UserProfile;

export class AlreadyLinkedError extends Error {
  constructor() {
    super("Account already linked to a different account");
  }

  code = "firebase-steam-login/account-already-linked";
}