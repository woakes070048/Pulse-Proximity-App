import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';

// Global vars
import { GlobalVars } from '../providers/global-vars';
import * as AppConfig from '../appConfig'

// Platform services
import { PlatformData } from './platform-data';
import { PlatformGeolocation } from './platform-geolocation';
import { PlatformBeacons } from './platform-beacons';
import { PlatformApi } from '../providers/platform-api';
import { PlatformDevice } from '../providers/platform-device';

@Injectable()

export class PlatformService {

  constructor(
    private http: Http,
    private globalVars: GlobalVars,
    private platformData: PlatformData,
    private platformGeolocation: PlatformGeolocation,
    private platformBeacons: PlatformBeacons,
    private platformApi: PlatformApi,
    private platformDevice: PlatformDevice
  ) {
  }

  /*
   * Initialize proximity data.
   * First init plugins, remove all listeners, then load latest data from api
   * and add listeners again.
   */
  init() {
    // Db created, seeded and opened
		this.platformData.initDb()
    // Get device info
    .then((db) => {
      console.log('Before platformDevice.getDevice');
      return this.platformDevice.getDevice();
    })
    // Initialize beacon plugin
    .then(() => {
      console.log('Before platformBeacons.init');
      return this.platformBeacons.init();
    })
    // Initialize geofence plugin
    .then(() => {
      console.log('Before platformGeolocation.init');
      return this.platformGeolocation.init();
    })
    // Stop listening to beacons
    .then(() => {
      console.log('Before platformBeacons.removeAllListeners');
      return this.platformBeacons.removeAllListeners();
    })
    // Stop listening to geofences
    .then(() => {
      console.log('Before platformGeolocation.removeAllListeners');
      return this.platformGeolocation.removeAllListeners();
    })
    // Load apps by token
    .then(() => {
      console.log('Before load apps by token');
      if(AppConfig.data.api_token.length > 0) {
        for(let i = 0; i < AppConfig.data.api_token.length; i++) {
          this.platformApi.postHandshake(AppConfig.data.api_token[i])
          .then((response: any) => {
            // Success, do nothing
            console.log(response);
          }, (err) => {
            console.log('Something went wrong: ' + err);
          });
        }
      }

    /*
    // Get all bookmarks (places)
    .then(() => {
      console.log('Before platformData.getBookmarks');
      return this.platformData.getBookmarks();
    })
    // Load related geofences and beacons
    .then((bookmarks) => {
      if(Object.keys(bookmarks).length) {
        for(let i = 0; i < Object.keys(bookmarks).length; i++) {
          let url = bookmarks[i].url;
          // Update latest data from server
          this.platformApi.postHandshake(url)
          .then((response: any) => {
            // Success, do nothing
            console.log(response);
          }, (err) => {
            console.log('Something went wrong: ' + err);
          });
        }
      }

      // Default bookmarks from config
      if(AppConfig.data.default_bookmarks.length > 0) {
        for(let i = 0; i < AppConfig.data.default_bookmarks.length; i++) {
          this.platformApi.postHandshake(AppConfig.data.default_bookmarks[i])
          .then((response: any) => {
            // Success, do nothing
            console.log(response);
          }, (err) => {
            console.log('Something went wrong: ' + err);
          });
        }
      }
*/
      console.log('App ready to go!');
    });
  }
}
