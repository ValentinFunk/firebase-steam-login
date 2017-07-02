export interface SteamProfileResult {
    provider: "steam",
    _json: any,
    id: number,
    displayName: string,
    photos: [{
        value: string // avatar
    }, {
        value: string // avatarmedium
    }, {
        value: string // avatarfull
    }]
}