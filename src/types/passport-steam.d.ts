/// <reference types="passport" />
/// <reference types="passport" />
import { SteamProfileResult } from 'ISteamProfileResults';
import passport = require("passport");
import express = require("express");

declare namespace SteamStrategy {
  interface IStrategyOptions {
    returnURL?: string;
    realm?: string;
    profile?: boolean;
    apiKey?: string;
  }


  interface VerifyFunction {
    (identifier: string | null, profile: SteamProfileResult, done: (err: Error | null, user: any) => void): void;
  }
}

declare class SteamStrategy implements passport.Strategy {
  constructor(options: SteamStrategy.IStrategyOptions, verify: SteamStrategy.VerifyFunction);

  authenticate: (req: express.Request, options?: Object) => void;
}

export = SteamStrategy;