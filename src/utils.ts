import { validClients } from "./config";
import * as express from "express";

/**
 * Wrapper function that makes an async function usable as express controller.
 * Redirects the user back to the session return URL that was set when initing the
 * auth request.
 *
 * example: ```
 *  async function(req, res) => {
 *    throw new Error();
 *  }
 *  app.get('/route', asyncRequestRedirectOnError.bind(undefined, functionThatErrors));
 * ```
 * @param asyncFn the function to wrap (should be bound)
 * @param req express request
 * @param res express response
 */
export function asyncRequestRedirectOnError(asyncFn: express.RequestHandler, req: express.Request, res: express.Response) {
  asyncFn(req, res, undefined).catch((e: any) => {
    if (validClients[req.session.client_id]) {
      const code = e.code ? e.code : "unknown";
      res.redirect(validClients[req.session.client_id] + "?code=" + code);
    } else {
      console.error(e);
      res.status(500).send("Error logging in");
    }
  });
}

/**
 * Wrapper function that makes an async function usable as express controller.
 * Returns the error in the request chain
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
export function asyncRequest(asyncFn: express.RequestHandler, req: express.Request, res: express.Response) {
  asyncFn(req, res, undefined).catch((e: any) => {
    console.error(e);
    res.status(500).send("Error " + e.message);
  });
}

/**
 * Wrapper function that makes an async function usable as express middleware.
 * Returns the error in the request chain
 *
 * example: ```
 *  async function(req, res) => {
 *    throw new Error();
 *  }
 *  app.use(asyncMiddleware.bind(undefined, functionThatErrors));
 * ```
 * @param asyncFn the function to wrap (should be bound)
 * @param req express request
 * @param res express response
 */
export function asyncMiddleware(asyncFn: express.RequestHandler, req: express.Request, res: express.Response, done: express.NextFunction) {
  asyncFn(req, res, undefined).then(done, done);
}