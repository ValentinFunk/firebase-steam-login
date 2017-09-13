import * as express from "express";
import { Config } from "../config/config";
import { asyncRequest } from "./utils";
import * as jwt from "jsonwebtoken";
import * as promisify from "typed-promisify";
const jwtSign = promisify.promisify<object, string, jwt.SignOptions, string>(jwt.sign);

export class JwtController {
  constructor(private config: Config) {}

  /**
   * Generates a JWT with a session time of a month.
   */
  generateLonglivedToken = asyncRequest.bind(undefined,
    async (req: express.Request, res: express.Response) => {
      if (!req.body.idToken) {
        throw new Error("Missing id token");
      }

      const parsedToken = await admin.app().auth().verifyIdToken(req.body.idToken);

      const payload = {
        uid: parsedToken.uid
      };
      const options: jwt.SignOptions = {
        issuer: "firebase-steam-login",
        expiresIn: "30d",
        algorithm: "RS256",
        subject: parsedToken.uid,
        audience: parsedToken.aud
      };

      const token = await jwtSign(payload, this.config.jwtConfig.jwtSecret, options);
      const decoded = jwt.decode(token) as any;
      res.json({ token, expires: decoded.exp * 1000 });
    }
  );

  /**
   * Returns JWT Public Key for token verification.
   */
  getJwtPublicKey(req: express.Request, res: express.Response) {
    res.json({ key: this.config.jwtConfig.jwtPublic });
  }
}