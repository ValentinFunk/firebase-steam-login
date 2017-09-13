export interface Config {
  clients: {
    [index: string]: string
  };
  jwtConfig: {
    jwtSecret: string,
    jwtPublic: string
  };
  discord: {
    clientId: string,
    clientSecret: string
  };
  rootUrl: string;
  steamApiKey: string;
  sessionSecret: string;
  corsOrigins: string[];
}
