import { Config } from "./config";
import * as dotenv from "dotenv";
import * as url from "url";
import * as admin from "firebase-admin";

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config();

/**
 * Validate all environment configuration
 */
export let firebaseCert: admin.credential.Credential;
try {
  firebaseCert = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACC));
} catch (e) {
  console.error("[ERROR] Invalid FIREBASE_SERVICE_ACC json: " + e.mesage);
  console.error(e);
  process.exit(1);
}

export let validClients: {
  [index: string]: string
};
try {
  validClients = JSON.parse(process.env.CLIENTS);
} catch (e) {
  console.error("[ERROR] Invalid CLIENTS json: " + e.mesage);
  console.error(e);
  process.exit(1);
}

export let firebaseDbUrl: string = process.env.FIREBASE_DB_URL;
if (!firebaseDbUrl) {
  console.error("Missing FIREBASE_DB_URL");
  process.exit(1);
}

export let jwtSecret: string = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error("Missing JWT_SECRET (jwt private key)");
  process.exit(1);
}

export let jwtPublic: string = process.env.JWT_PUBLIC;
if (!jwtPublic) {
  console.error("Missing JWT_PUBLIC (jwt public key");
  process.exit(1);
}

export let rootUrl: string = process.env.ROOT_URL;
if (!rootUrl) {
  console.error("Missing ROOT_URL");
  process.exit(1);
}

export let steamApiKey: string = process.env.STEAM_API_KEY;
if (!steamApiKey) {
  console.error("[ERROR] No STEAM_API_KEY specified");
  process.exit(1);
}

export let discordClientId: string = process.env.DISCORD_CLIENT_ID;
if (!steamApiKey) {
  console.error("[ERROR] No DISCORD_CLIENT_ID specified");
  process.exit(1);
}

export let discordClientSecret: string = process.env.DISCORD_CLIENT_SECRET;
if (!steamApiKey) {
  console.error("[ERROR] No DISCORD_CLIENT_SECRET specified");
  process.exit(1);
}

export let sessionSecret: string = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error("[ERROR] Missing SESSION_SECRET");
  process.exit(1);
}

export const EnvConfig: Config & { firebaseConfig: admin.AppOptions } = {
  firebaseConfig: {
    credential: firebaseCert,
    databaseURL: firebaseDbUrl
  },
  clients: validClients,
  jwtConfig: {
    jwtPublic,
    jwtSecret
  },
  rootUrl,
  steamApiKey,
  discord: {
    clientSecret: discordClientSecret,
    clientId: discordClientId
  },
  sessionSecret,
  corsOrigins: Object.values(validClients)
    .map(returnUrl => {
      const parsed = url.parse(returnUrl);
      return parsed.protocol + "//" + parsed.hostname + ":" + parsed.port;
    })
};
