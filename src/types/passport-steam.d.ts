/// <reference types="passport" />
/// <reference types="passport" />
import { SteamProfileResult } from 'ISteamProfileResults';
import passport = require("passport");
import express = require("express");

interface IStrategyOptions {
    returnURL?: string; // asd
    realm?: string;
    profile?: boolean;
    apiKey?: string;
}


interface VerifyFunction {
    (identifier: string | null, profile: SteamProfileResult, done: (err: Error | null, user: any) => void): void;
}

declare class SteamStrategy implements passport.Strategy {
    constructor(options: IStrategyOptions, verify: VerifyFunction);

    authenticate: (req: express.Request, options?: Object) => void;
}

export = SteamStrategy;