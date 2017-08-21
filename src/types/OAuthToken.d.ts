export interface OAuthTokenResponse {
  "access_token": string,
  "token_type": "Bearer",
  "expires_in": number,
  "refresh_token": string,
  "scope": string
}

export interface StoredToken {
  "access_token": string,
  "token_type": "Bearer",
  "expires": number,
  "refresh_token": string,
  "scope": string
}
