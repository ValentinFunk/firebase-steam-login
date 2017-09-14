# Steam -> Firebase token generator

1) Enables users to log in via steam, then redirects passing a firebase auth token as query (via ?token=blabla).
2) Users can link their Discord app to their steam account.

## Running

Dev: ``yarn dev``
Prod: ``yarn start``

In your consuming app redirect the user to to /auth/steam?client_id=\<clientId\>. ``clientId`` needs to be configured in the CLIENTS environment variable (see below).

## Configuration

Copy .env.example to .env and fill in custom values.
FIREBASE\_SERVICE\_ACC is a firebase service account as json.
CLIENTS is json in the format { clientId: redirectUrl }

### Example:

You have configured ```CLIENTS['my-app'] = 'https://yourdomain.com/login_success'```. You redirect the user to ```https://firebase-steam-login/auth/steam?client_id=my-app```. After the login is finished the user will be redirected to ```https://yourdomain.com/login\_success?token=aehcndb3u584...```


## Deploying to Firebase Functions

Make sure the project is set up as firebase project by running ```firebase init```

Next fill all configuration variables. Firebase functions does not use environment variables but instead the functions.config() object. To configure it convenienty create a new JSON file in the following format. (To generate a private/public key pair you can use ssh-keygen):

```json
{
  "steam-login": {
    "discord": {
      "client-id": "client-id",
      "client-secret": "client secret"
    },
    "clients": {
      "my-app": "https://my-app.com/login_success"
    },
    "jwt-config": {
      "jwt-secret": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n",
      "jwt-public": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
    },
    "session-secret": "some random string",
    "steam-api-key": "steam api key",
    "root-url": "root url (e.g. https://my-app.com",
    "firebase": {
      "client_id": "afssdaf",
      "THIS IS YOUR FIREBASE SERVICE ACCOUNT": "FROM https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk"
    }
  }
}
```

Pipe the json to the config generator: ```cat config.json | node json-to-firebase-config.js```

Deploy the function: ```yarn deploy:firebase```

You can then use all of the endpoints against that function. (https://us-central1-project-id.cloudfunctions.net/firebaseSteamLogin/auth/steam?client_id=my-app)

Note: At the moment we cannot use functions.config().firebase as the credentials do not support signing tokens (see also https://stackoverflow.com/questions/42717540/firebase-cloud-functions-createcustomtoken/42724251#42724251)