import { Config } from "./config";
import * as functions from "firebase-functions";
import * as url from "url";
import { changeKeyCase } from "../util/change-key-case";

const camelConfig = changeKeyCase(functions.config(), "camel");

const corsOrigins = Object.values(camelConfig.steamLogin.clients)
  .map(returnUrl => {
    const parsed = url.parse(returnUrl);
    return parsed.protocol + "//" + parsed.hostname + ":" + parsed.port;
  });

export const config: Config = {
  ...camelConfig.steamLogin,
  corsOrigins
};
