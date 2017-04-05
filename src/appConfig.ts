export let data = {
  /*
   * ---------------------------------------------------
   * The Proximity Platform API endpoint
   * E.g. "https://platform.example.com"
   * ---------------------------------------------------
   */

  "platform_url" : "https://example.com",

  /*
   * ---------------------------------------------------
   * App API token(s)
   * Currently cards only work with one token.
   * ---------------------------------------------------
   */

  "api_token": [""],

  /*
   * ---------------------------------------------------
   * Google Maps API keys
   * https://developers.google.com/maps/documentation/javascript/get-api-key
   * ---------------------------------------------------
   */

  "google_maps_key": "",

  /*
   * ---------------------------------------------------
   * Notification settings for geofences, Android only.
   * smallIcon supports only resources URI like
   * res://ic_menu_mylocation, res://icon,
   * res://ic_menu_call
   * ---------------------------------------------------
   */

  "notification": {
      smallIcon: "res://ic_menu_mylocation",
      icon: "file://assets/images/icons/notification-icon.png"
  },

  /*
   * ---------------------------------------------------
   * Coordinates in case location can't be resolved
   * ---------------------------------------------------
   */

  "default_location": [{
      latitude: 0,
      longitude: 0
  }]
}
