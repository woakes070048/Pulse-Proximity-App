import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/retry';
import 'rxjs/add/operator/timeout';
import 'rxjs/add/operator/map';

import * as AppConfig from '../appConfig';

// Global vars
import { GlobalVars } from '../providers/global-vars';

// Platform services
import { PlatformData } from './platform-data';
import { PlatformGeolocation } from './platform-geolocation';
import { PlatformBeacons } from './platform-beacons';

@Injectable()
export class PlatformApi {

  constructor(
    private http: Http,
    private globalVars: GlobalVars,
    private platformData: PlatformData,
    private platformGeolocation: PlatformGeolocation,
    private platformBeacons: PlatformBeacons
  ) {
  }

  /*
   * Post token to web API
   */
  postHandshake(token: string) {
    return new Promise((resolve, reject) => {
      // Get current location
      this.platformGeolocation.getLocation()
      .then((location: any) => {
        let headers = new Headers({
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        });

        let options = new RequestOptions({
          headers: headers
        });

        // Get device info from global vars
        let device = this.globalVars.getDevice();

        let params = {
          token: token,
          lat: location.latitude,
          lng: location.longitude,
          acc: Math.round(location.accuracy),
          uuid: device.uuid,
          model: device.model,
          platform: device.platform
        };

        let str = [];

        for (var k in params) {
          str.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
        }

        let body = str.join("&");

        return this.http.post(AppConfig.data.platform_url + '/api/v1/remote?token=' + token, body, options)
        .timeout(10000)
        .retry(2)
        .map(res => res.json())
        .subscribe(
          response => {
            console.log('postHandshake -------------------');
            console.log(AppConfig.data.platform_url + '/api/v1/remote?token=' + token + '&' + body);
            console.log('postHandshake input -------------------');
            console.log(params);
            console.log('postHandshake output -------------------');
            console.log(response);
            // Data found, save app + load scenario board
            if (typeof response.scenarios !== 'undefined' && response.scenarios.length > 0) {

              // Check if url exists and insert if not
              let data = {
                token: token,
                json: response
              };

              this.platformData.insertOrUpdateBookmark(data)
              .then((response: any) => {
                // Parse api
                return this.platformData.parseApi(response.data, response.bookmark_id);
              })
              // Subscribe to beacons and geofences
              .then((subscriptions: any) => {
                console.log('before platformBeacons.subscribeToBeacons');

                this.platformBeacons.subscribeToBeacons(subscriptions.beaconsToSubscribe)
                .then(() => {
                  console.log('platformBeacons.subscribeToBeacons');
                  return this.platformGeolocation.subscribeToGeofences(subscriptions.geofencesToSubscribe);
                })
                .then(() => {
                  // Ready
                  console.log('Ready postHandshake!');
                  resolve(true);
                });
              })
            } else {
              resolve(false);
            }
          },
          err => { reject('Could not connect to server, check your internet connection and try again.'); }
        );
      });
    }) // End get current location
  }
}
