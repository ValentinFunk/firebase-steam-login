import * as dotenv from "dotenv";

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: ".env" });

export let firebaseCert: {};
try {
  firebaseCert = JSON.parse(process.env.FIREBASE_SERVICE_ACC);
} catch (e) {
  console.error("[ERROR] Invalid FIREBASE_SERVICE_ACC json: " + e.mesage);
  console.error(e);
  process.exit(1);
}

export let validClients: {
    [index:string]: string
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

export let rootUrl: string = process.env.ROOT_URL;
if (!rootUrl) {
    console.error("Missing ROOT_URL");
    process.exit(1);
}

export let realm: string = process.env.REALM;
if (!rootUrl) {
    console.error("Missing REALM");
    process.exit(1);
}

export let steamApiKey: string = process.env.STEAM_API_KEY;
if (!steamApiKey) {
  console.error("[ERROR] No STEAM_API_KEY specified");
  process.exit(1);
}