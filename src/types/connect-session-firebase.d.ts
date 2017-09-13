import * as session from "express-session";
import * as admin from "firebase-admin";

declare namespace connectSessionFirebase {
  export interface FirebaseStoreOptions {
    sessions?: string;
    reapInterval?: number;
    reapCallback?: () => void;
    database: admin.database.Database;
  }
}

declare class FirebaseStore extends session.Store {
  constructor(options: connectSessionFirebase.FirebaseStoreOptions);
  reap(callback: any): admin.database.ThenableReference;
}


declare function connectSessionFirebase(expressSession: typeof session): typeof FirebaseStore;

export = connectSessionFirebase;