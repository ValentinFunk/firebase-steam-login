/// <reference types="passport" />
import passport = require("passport");
import express = require("express");

declare namespace DiscordStrategy {
  interface IStrategyOptions {
    clientID: string,
    clientSecret: string,
    callbackURL: string,
    scope: string[]
  }

  interface VerifyFunction {
    (accessToken: string, refreshToken: string, profile: any, done: (err: Error | null, user: any) => void): void;
  }
}

declare class DiscordStrategy implements passport.Strategy {
  constructor(options: DiscordStrategy.IStrategyOptions, verify: DiscordStrategy.VerifyFunction);

  authenticate: (req: express.Request, options?: Object) => void;
}

export = DiscordStrategy;