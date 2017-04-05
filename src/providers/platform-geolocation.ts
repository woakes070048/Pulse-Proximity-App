import { Platform } from 'ionic-angular';
import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Geolocation } from '@ionic-native/geolocation';
import { Geofence } from '@ionic-native/geofence';
import 'rxjs/add/operator/map';

import * as AppConfig from '../appConfig';

// Global vars
import { GlobalVars } from '../providers/global-vars';

// Platform services
import { PlatformData } from './platform-data';
import { PlatformScenario } from './platform-scenario';

@Injectable()
export class PlatformGeolocation {

  constructor(
    public http: Http,
    private platform: Platform,
    private globalVars: GlobalVars,
    private platformData: PlatformData,
    private platformScenario: PlatformScenario,
    private geofence: Geofence,
    private geolocation: Geolocation
  ) {
  }

  /*
   * Initialize geofence plugin
   */
  init() {
    return new Promise((resolve, reject) => {
      var that = this;
      this.geofence.initialize().then(function () {
        console.log("Successful geofence initialization");
        that.listenToGeofences();
        resolve(true);
      }, function (error) {
        console.log("Geofence error", error);
        reject(error);
      });
    });
  }

  /*
   * Get device location and save to global settings
   */
  getLocation() {
    return new Promise((resolve, reject) => {
        /*
        this.geolocation.watchPosition({ timeout: 5000, enableHighAccuracy: true }).subscribe((resp) => {
          // resp.coords.latitude
          // resp.coords.longitude
          this.globalVars.setLocation(resp.coords);

          console.log('------------------------------------');
          console.log(resp.coords);
          resolve(resp.coords);
        })
      });
      */

      this.geolocation.getCurrentPosition({ timeout: 5000, enableHighAccuracy: true }).then((resp) => {
        if (typeof resp.coords.latitude !== 'undefined') {
          // resp.coords.latitude
          // resp.coords.longitude
          this.globalVars.setLocation(resp.coords);

          console.log('enableHighAccuracy: true');
          console.log(resp.coords);
          resolve(resp.coords);
        } else {
          this.geolocation.getCurrentPosition({ timeout: 8000, enableHighAccuracy: false }).then((resp) => {
            if (typeof resp.coords.latitude !== 'undefined') {
              // resp.coords.latitude
              // resp.coords.longitude
              this.globalVars.setLocation(resp.coords);

              console.log('enableHighAccuracy: false');
              console.log(resp.coords);
              resolve(resp.coords);
            } else {
              // Location not found for whatever reason, use default location
              this.globalVars.setLocation(AppConfig.data.default_location);
              resolve(AppConfig.data.default_location);
            }
          }).catch((error) => {
            console.log('Error getting location', error);

            // Location not found for whatever reason, use default location
            this.globalVars.setLocation(AppConfig.data.default_location);
            resolve(AppConfig.data.default_location);
          });
        }
      }).catch((error) => {
        console.log('Error getting location', error);

        // Location not found for whatever reason, use default location
        this.globalVars.setLocation(AppConfig.data.default_location);
        resolve(AppConfig.data.default_location);
      });
    });
  }

  /*
   * Stop listening to all geofences
   */
  removeAllListeners() {
    return new Promise((resolve, reject) => {
      this.geofence.removeAll()
      .then(function () {
        console.log('All geofences successfully removed.');
        resolve(true);
      }, function (reason) {
        console.log('Removing geofences failed', reason);
        reject(reason);
      });
    });
  }

  /*
   * Subscribe to geofences
   */
  subscribeToGeofences(geofencesToSubscribe) {
    return new Promise((resolve, reject) => {
      // Remove all existing geofences
      this.removeAllListeners();

  		if (geofencesToSubscribe !== null) {
  			if (geofencesToSubscribe.length > 0) {
          console.log("Subscribe to geofence(s)");
          console.log(geofencesToSubscribe);

          this.geofence.addOrUpdate(geofencesToSubscribe)
          .then((result) => {
            //this.listenToGeofences();
            resolve(true);
          });
  			} else {
          resolve(true);
        }
  		}
    });
  }

  /*
   * Process geofence observable (foreground only)
   */
  listenToGeofences() {
    let that = this;
    this.geofence.onTransitionReceived()
    .subscribe(geofences => {

      console.log("Geofence.onTransitionReceived()");
      console.log(geofences);

      geofences.forEach(function (geofence) {

        console.log('listenToGeofences');
        console.log(geofence);

        let id = geofence.id;
        let pos = id.indexOf('-');
        let current_state = geofence.transitionType;
        let geofence_id = id.slice(pos + 1, id.length);
        let scenario_id = id.slice(1, pos);

        if (that.platform.is('android')) {

          /*
           * ---------------------------------------------------------------------------------------
           * Android
           * ---------------------------------------------------------------------------------------
           */
          //that.platformData.db.executeSql("SELECT s.*, i.count, sg.identifier, sg.lat, sg.lng, sg.radius, sg.id type_id FROM scenarios s, scenario_geofences sg LEFT JOIN interactions i ON i.id = s.id WHERE sg.id = ? AND sg.scenario_id = s.id  AND s.scenario_if_id = ?",
          that.platformData.db.executeSql("SELECT s.*, i.count, sg.identifier, sg.lat, sg.lng, sg.radius, sg.id type_id FROM scenarios s, scenario_geofences sg LEFT JOIN interactions i ON i.id = s.id WHERE sg.scenario_id =  ?",
            /*[geofence_id, current_state])*/
            [scenario_id])
            .then((result) => {
              if (result.rows.length > 0) {
                // Parse and execute scenario
                let scenario = result.rows.item(0);
                that.platformScenario.parseScenario(scenario);
              }
          });
        } else {

          /*
           * ---------------------------------------------------------------------------------------
           * iOS
           * ---------------------------------------------------------------------------------------
           */
          // Save state to db
          that.platformData.db.executeSql("SELECT * FROM geofence_monitoring WHERE id = ?", [geofence_id])
          .then((result) => {
            let previous_state;
            let scenario_if_id;
            let previous_update = 0;
            let can_trigger_scenario = 1;

            if (result.rows.length > 0) {
              can_trigger_scenario = parseInt(result.rows.item(0).can_trigger_scenario);
              previous_state = result.rows.item(0).state;
              previous_update = result.rows.item(0).updated;
              previous_update = previous_update + 5;
            }

            if (result.rows.length > 0 && previous_state != current_state && Date.now() >= previous_update) {
              can_trigger_scenario = 1;
            }

            switch (current_state) {
              case 1: // enter
                scenario_if_id = 1;
                break;
              case 2: // exit
                scenario_if_id = 2;
                break;
            }

            that.platformData.db.executeSql("INSERT OR REPLACE INTO geofence_monitoring (id, state, can_trigger_scenario, updated) VALUES (?, ?, ?, ?);", [
                geofence_id,
                current_state,
                can_trigger_scenario,
                Date.now()
              ])
            .then((result) => {
              // Check if scenario should be triggered
              if (can_trigger_scenario == 1) {
                that.platformData.db.executeSql("SELECT s.*, i.count, sg.identifier, sg.lat, sg.lng, sg.radius, sg.id type_id FROM scenarios s, scenario_geofences sg LEFT JOIN interactions i ON i.id = s.id WHERE sg.id = ? AND sg.scenario_id = s.id  AND s.scenario_if_id = ? AND ifnull(i.timer, 0) <= ?", [geofence_id, scenario_if_id, Date.now()])
                .then((result) => {
                  if (result.rows.length > 0) {
                    // We have a scenario, verify other conditions
                    let scenario = result.rows.item(0);
                    scenario.type = 'geofence';

                    // Validate date / time conditions
                    if (that.platformScenario.validateDateTimeConditions(scenario)) {

                      // Insert & process interaction
                      let now = Date.now();
                      let timer = now + (scenario.frequency * 1); // Scenario can be retriggered after frequency * seconds
                      let count = scenario.count++;

                      let sqlQueries = [];

                      sqlQueries.push(["INSERT OR REPLACE INTO interactions(id, bookmark_id, identifier, type, action, count, timer, created, updated) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)", [scenario.id, scenario.bookmark_id, scenario.identifier, 'geofence', current_state, count, timer, now, now]]);
                      sqlQueries.push(["UPDATE geofence_monitoring SET can_trigger_scenario = ? WHERE id = ?", [0, geofence_id]]);

                      that.platformData.db.sqlBatch(sqlQueries).then((data) => {
                        //console.log('Interaction, scenario #' + scenario.id + ', geofence #' + geofence_id + ', bookmark #' + scenario.bookmark_id + ', state ' + current_state);

                        // Parse and execute scenario
                        that.platformScenario.parseScenario(scenario);
                      }, function(error) {
                        console.log('SQLite error: ' + error.message);
                      });
                    }
                  }
                });
              } // can_trigger_scenario
            });
          });
        }
      });
    });
  }
}
