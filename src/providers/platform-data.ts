import { Platform } from 'ionic-angular';
import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';

import { SQLite, SQLiteObject } from '@ionic-native/sqlite';

// Global vars
import { GlobalVars } from '../providers/global-vars';
import * as AppConfig from '../appConfig';

@Injectable()
export class PlatformData {
  public db: SQLiteObject;
  public sqlite: SQLite;
  private isOpen: boolean;

  constructor(
    public platform: Platform,
    private http: Http,
    private globalVars: GlobalVars
  ) {
  }

  /*
   * Create tables if they don't exist
   */
  initDb() {
    return new Promise((resolve, reject) => {
      if(! this.isOpen) {
        let sql = this.getSql();
        this.sqlite = new SQLite();

        this.sqlite.create({
          name: 'PlatformData.db',
          location: 'default' // the location field is required
        }).then((db: SQLiteObject) => {
          this.db = db;
          db.sqlBatch(sql).then(() => {
            this.isOpen = true;
            resolve(this.db);
          }, (err) => {
            console.error('Unable to execute sql: ', err);
            reject(err);
          });
        }, (err) => {
          console.error('Unable to open database: ', err);
          reject(err);
        });
      } else {
        resolve(this.db);
      }
    });
  }

  /*
   * Check if token exists for bookmark and insert if not
   */
  insertOrUpdateBookmark(data: any) {
    return new Promise((resolve, reject) => {
      console.log(1);

      this.db.executeSql("SELECT id FROM bookmarks WHERE token = ?", [data.token]).then((result) => {
        if (result.rows.length == 0) {

          this.db.executeSql("INSERT INTO bookmarks (token, api, created, updated) VALUES (?, ?, ?, ?);", [
            data.token,
            JSON.stringify(data.json),
            Date.now(),
            Date.now()
          ]).then((result) => {
            // Bookmark inserted, resolve
            resolve({
              data: data.json,
              bookmark_id: result.insertId
            });
          });
        } else {
            let bookmark_id = result.rows.item(0).id;

            this.db.executeSql("UPDATE bookmarks SET token = ?, api = ?, updated = ? WHERE id = ?;", [
              data.token,
              JSON.stringify(data.json),
              Date.now(),
              bookmark_id
            ]).then((result) => {
              // Bookmark updated, do nothing
            });

            // Resolve
            resolve({
              data: data.json,
              bookmark_id: bookmark_id
            });
          }
        });
    });
  }

  /*
   * This function will take the handshake API in JSON format
   * and extract/convert it to tables in the SQLite database
   */
  parseApi(jsonApi, bookmark_id) {
    return new Promise((resolve, reject) => {
      let beaconsToSubscribe = [];
      let geofencesToSubscribe = [];

      // Batch queries
      let sqlQueries = [];

      // Delete all bookmark related items in case
      // scenarios, beacons, geofences, etc. are deleted
      sqlQueries.push(["DELETE FROM scenarios WHERE bookmark_id = ?;", [bookmark_id]]);
      sqlQueries.push(["DELETE FROM scenario_beacons WHERE bookmark_id = ?;", [bookmark_id]]);
      sqlQueries.push(["DELETE FROM scenario_geofences WHERE bookmark_id = ?;", [bookmark_id]]);

      // Insert scenarios
      let scenarios = jsonApi.scenarios;

      if (scenarios.length > 0) {
        for (let scenario_index = 0; scenario_index < scenarios.length; ++scenario_index) {
          sqlQueries.push(["INSERT INTO scenarios (id, bookmark_id, scenario, timezone, scenario_if_id, scenario_then_id, scenario_day_id, scenario_time_id, time_start, time_end, date_start, date_end, frequency, delay, notification) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", [
            scenarios[scenario_index].id,
            bookmark_id,
            JSON.stringify(scenarios[scenario_index]),
            jsonApi.meta.timezone,
            scenarios[scenario_index].scenario_if_id,
            scenarios[scenario_index].scenario_then_id,
            scenarios[scenario_index].scenario_day_id,
            scenarios[scenario_index].scenario_time_id,
            scenarios[scenario_index].time_start,
            scenarios[scenario_index].time_end,
            scenarios[scenario_index].date_start,
            scenarios[scenario_index].date_end,
            scenarios[scenario_index].frequency,
            scenarios[scenario_index].delay,
            scenarios[scenario_index].notification,
          ]]);

          let scenario_id = scenarios[scenario_index].id;

          // Insert attached beacons
          let beacons = scenarios[scenario_index].beacons;
          if (beacons.length > 0) {
            for (let beacon_index = 0; beacon_index < beacons.length; ++beacon_index) {

              // Get beacon details
              let allBeacons = jsonApi.beacons;

              if (allBeacons.length > 0) {
                for (let i = 0; i < allBeacons.length; ++i) {
                  if (parseInt(allBeacons[i].id) == parseInt(beacons[beacon_index])) {
                    let beaconToSubscribe = [
                      beacons[beacon_index],
                      scenario_id,
                      bookmark_id,
                      allBeacons[i].identifier,
                      allBeacons[i].uuid,
                      allBeacons[i].major,
                      allBeacons[i].minor
                    ];

                    sqlQueries.push(["INSERT INTO scenario_beacons (id, scenario_id, bookmark_id, identifier, uuid, major, minor) VALUES (?, ?, ?, ?, ?, ?, ?);", beaconToSubscribe]);

                    beaconsToSubscribe.push(beaconToSubscribe);
                  }
                }
              }
            }
          }

          // Insert attached geofences
          let geofences = scenarios[scenario_index].geofences;
          if (geofences.length > 0) {
            for (let geofence_index = 0; geofence_index < geofences.length; ++geofence_index) {

              // Get geofence details
              let allGeofences = jsonApi.geofences;

              if (allGeofences.length > 0) {
                for (let i = 0; i < allGeofences.length; ++i) {
                  if (parseInt(allGeofences[i].id) == parseInt(geofences[geofence_index])) {

                    let geofence_subscription_id = 'g' + String(scenarios[scenario_index].id) + '-' + String(geofences[geofence_index]);

                    let geofenceToSubscribe = [
                      geofences[geofence_index],
                      scenario_id,
                      bookmark_id,
                      allGeofences[i].identifier,
                      allGeofences[i].lat,
                      allGeofences[i].lng,
                      allGeofences[i].radius
                    ];

                    sqlQueries.push(["INSERT INTO scenario_geofences (id, scenario_id, bookmark_id, identifier, lat, lng, radius) VALUES (?, ?, ?, ?, ?, ?, ?);", geofenceToSubscribe]);

                    if (this.platform.is('android')) {
                      // Generate unique id for geofence
                      let latitude = parseFloat(allGeofences[i].lat);
                      let longitude = parseFloat(allGeofences[i].lng);
                      let radius = parseInt(allGeofences[i].radius);
                      let transitionType = parseInt(scenarios[scenario_index].scenario_if_id);

                      //console.log('Geofence notification ID: ' + parseInt(scenarios[scenario_index].id));
                      //console.log('Geofence transitionType: ' + parseInt(scenarios[scenario_index].scenario_if_id));
                      //console.log('Geofence notification text: ' + scenarios[scenario_index].notification);

                      // Listen to geofence with notification
                      geofencesToSubscribe.push({
                        id: geofence_subscription_id,
                        latitude: latitude,
                        longitude: longitude,
                        radius: radius,
                        transitionType: transitionType,
                        notification: {
                          id: parseInt(scenarios[scenario_index].id), // Optional should be integer, id of notification
                          /*title: AppConfig.data.notification.title, // Title of notification */
                          text: scenarios[scenario_index].notification, // Text of notification
                          openAppOnClick: true, // Should app be opened after clicking on notification
                          smallIcon: AppConfig.data.notification.smallIcon, // Small icon showed in notification area, only res URI
                          icon: AppConfig.data.notification.icon, // Icon showed in notification drawer
                          data: { scenario: scenarios[scenario_index] }  // Custom object associated with notification
                        }
                      });
                    } else {
                      geofencesToSubscribe.push([
                        geofence_subscription_id,
                        scenario_id,
                        bookmark_id,
                        allGeofences[i].identifier,
                        allGeofences[i].lat,
                        allGeofences[i].lng,
                        allGeofences[i].radius
                      ]);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Make beacon array unique and convert to object
      let flags = [];
      let output = [];
      let  l = beaconsToSubscribe.length;

      if (l > 0) {
        for (let i = 0; i < l; i++) {
          if (flags[beaconsToSubscribe[i][0]]) continue;
          flags[beaconsToSubscribe[i][0]] = true;
          output.push({
            identifier: 'b' + String(beaconsToSubscribe[i][0]),
            uuid: beaconsToSubscribe[i][4],
            major: beaconsToSubscribe[i][5],
            minor: beaconsToSubscribe[i][6]
          });
        }
        beaconsToSubscribe = output;
      }

      // Make geofence array unique and convert to object
      if (this.platform.is('ios')) {
        flags = [];
        output = [];
        l = geofencesToSubscribe.length;

        if (l > 0) {
          for (let i = 0; i < l; i++) {
            if (flags[geofencesToSubscribe[i][0]]) continue;
            flags[geofencesToSubscribe[i][0]] = true;
            output.push({
              id: String(geofencesToSubscribe[i][0]),
              latitude: parseFloat(geofencesToSubscribe[i][4]),
              longitude: parseFloat(geofencesToSubscribe[i][5]),
              radius: parseInt(geofencesToSubscribe[i][6]),
              transitionType: 3
            });
          }
          geofencesToSubscribe = output;
        }
      }

      this.db.sqlBatch(sqlQueries).then((data) => {
        resolve({
          beaconsToSubscribe: beaconsToSubscribe,
          geofencesToSubscribe: geofencesToSubscribe
        });
      });
    });
  }

  /*
   * Get bookmarks from db
   */
  getBookmarks() {
    return new Promise((resolve, reject) => {
      this.db.executeSql("SELECT * FROM bookmarks", []).then((data) => {
        console.log('getBookmarks');

        let bookmarks = [];

        if(data.rows.length > 0) {
          for(let i = 0; i < data.rows.length; i++) {
            bookmarks.push({
              id: data.rows.item(i).id,
              name: data.rows.item(i).name,
              type: data.rows.item(i).type,
              icon: data.rows.item(i).icon,
              token: data.rows.item(i).token,
              api: data.rows.item(i).api,
              label: data.rows.item(i).label,
              locked: data.rows.item(i).locked,
              meta: data.rows.item(i).meta,
              created: data.rows.item(i).created,
              updated: data.rows.item(i).updated
            });
          }
        }
        resolve(bookmarks);
      }, (error) => {
          reject(error);
      });
    });
  }

  /*
   * Get places
   */
  getPlaces() {
    return new Promise((resolve, reject) => {
      this.db.executeSql("SELECT b.* FROM bookmarks b LEFT JOIN interactions i ON b.id = i.bookmark_id GROUP BY b.id ORDER BY i.updated DESC;", []).then((data) => {
        console.log('getPlaces');

        let bookmarks = [];

        if(data.rows.length > 0) {
          for(let i = 0; i < data.rows.length; i++) {
            bookmarks.push({
              id: data.rows.item(i).id,
              name: data.rows.item(i).name,
              type: data.rows.item(i).type,
              icon: data.rows.item(i).icon,
              token: data.rows.item(i).token,
              label: data.rows.item(i).label,
              locked: data.rows.item(i).locked
            });
          }
        }
        resolve(bookmarks);
      }, (error) => {
          reject(error);
      });
    });
  }

  /*
   * Delete place
   */
  deletePlace(bookmark_id) {
    return new Promise((resolve, reject) => {

      var sqlQueries = [];

      sqlQueries.push(["DELETE FROM scenarios WHERE bookmark_id = ?;", [bookmark_id]]);
      sqlQueries.push(["DELETE FROM scenario_geofences WHERE bookmark_id = ?;", [bookmark_id]]);
      sqlQueries.push(["DELETE FROM scenario_beacons WHERE bookmark_id = ?;", [bookmark_id]]);
      sqlQueries.push(["DELETE FROM interactions WHERE bookmark_id = ?;", [bookmark_id]]);
      sqlQueries.push(["DELETE FROM bookmarks WHERE id = ?;", [bookmark_id]]);

      this.db.sqlBatch(sqlQueries).then((data) => {
        resolve(true);
      }, function(error) {
        console.log('SQLite error: ' + error.message);
        reject(error.message);
      });
    });
  }

  /*
   * Get history
   */
  getHistory() {
    return new Promise((resolve, reject) => {
      this.db.executeSql("SELECT i.*, s.scenario_if_id, s.scenario FROM interactions i, bookmarks b LEFT JOIN scenarios s ON b.id = s.bookmark_id WHERE i.id = s.id GROUP BY i.id ORDER BY i.created DESC;", []).then((data) => {
        console.log('getHistory');

        let bookmarks = [];

        if(data.rows.length > 0) {
          for(let i = 0; i < data.rows.length; i++) {
            bookmarks.push({
              id: data.rows.item(i).id,
              name: data.rows.item(i).name,
              type: data.rows.item(i).type,
              scenario_if_id: data.rows.item(i).scenario_if_id,
              scenario: data.rows.item(i).scenario,
              identifier: data.rows.item(i).identifier
            });
          }
        }
        resolve(bookmarks);
      }, (error) => {
          reject(error);
      });
    });
  }

  /*
   * Delete history
   */
  deleteHistory(interaction_id) {
    return new Promise((resolve, reject) => {

      var sqlQueries = [];

      sqlQueries.push(["DELETE FROM interactions WHERE id = ?;", [interaction_id]]);

      this.db.sqlBatch(sqlQueries).then((data) => {
        resolve(true);
      }, function(error) {
        console.log('SQLite error: ' + error.message);
        reject(error.message);
      });
    });
  }

  /*
   * Get data model sql
   */
  getSql(dropTables = false) {
    let sqlDrop = [
      'DROP TABLE "beacon_monitoring";',
      'DROP TABLE "beacon_ranging";',
      'DROP TABLE "bookmarks";',
      'DROP TABLE "geofence_monitoring";',
      'DROP TABLE "interactions";',
      'DROP TABLE "scenarios";',
      'DROP TABLE "scenario_beacons";',
      'DROP TABLE "scenario_geofences";',
      'DROP TABLE "settings";'
    ];

    let sqlInsert = [
      'CREATE TABLE IF NOT EXISTS "beacon_monitoring" ("id" integer NOT NULL, "state" text NOT NULL, "can_trigger_scenario" integer NOT NULL DEFAULT 1, "updated" integer NOT NULL, PRIMARY KEY("id"));',
      'CREATE TABLE IF NOT EXISTS "beacon_ranging" ("id" integer NOT NULL, "current_proximity" text NOT NULL, "previous_proximity" text, "can_trigger_scenario" integer NOT NULL DEFAULT 1, "updated" integer NOT NULL,  PRIMARY KEY("id"));',
      'CREATE TABLE IF NOT EXISTS "bookmarks" ( "id" integer NOT NULL, "token" text NOT NULL, "api" text, "label" text, "locked" integer, "meta" text, "created" integer NOT NULL, "updated" integer,  PRIMARY KEY("id"));',
      'CREATE TABLE IF NOT EXISTS "geofence_monitoring" ( "id" integer NOT NULL, "state" text NOT NULL, "can_trigger_scenario" integer NOT NULL, "updated" integer NOT NULL, PRIMARY KEY("id"));',
      'CREATE TABLE IF NOT EXISTS "interactions" ( "id" integer NOT NULL, "bookmark_id" integer NOT NULL, "identifier" text NOT NULL, "type" text NOT NULL, "action" text NOT NULL, "lat" text, "lng" text, "count" integer NOT NULL DEFAULT 1, "timer" integer NOT NULL DEFAULT 0, "meta" text, "created" integer NOT NULL, "updated" integer NOT NULL, PRIMARY KEY("id"));',
      'CREATE TABLE IF NOT EXISTS "scenarios" ( "id" integer NOT NULL, "bookmark_id" integer NOT NULL, "scenario" text NOT NULL, "timezone" text NOT NULL, "scenario_if_id" integer NOT NULL, "scenario_then_id" integer NOT NULL, "scenario_day_id" integer NOT NULL, "scenario_time_id" integer NOT NULL, "time_start" text, "time_end" text, "date_start" text, "date_end" text, "frequency" integer NOT NULL, "delay" integer NOT NULL, "trigger_when_starts_active" integer NULL, "notification" text, "meta" text, PRIMARY KEY("id"), CONSTRAINT "fk_scenarios_bookmarks_bookmark_id" FOREIGN KEY ("bookmark_id") REFERENCES "bookmarks" ("id") ON DELETE CASCADE ON UPDATE CASCADE);',
      'CREATE TABLE IF NOT EXISTS "scenario_beacons" ( "id" integer NOT NULL, "scenario_id" integer NOT NULL, "bookmark_id" integer NOT NULL, "identifier" text NOT NULL, "uuid" text NOT NULL, "major" integer NOT NULL, "minor" integer NOT NULL, PRIMARY KEY("scenario_id","id"), CONSTRAINT "fk_scenario_beacons_scenarios_scenario_id" FOREIGN KEY ("scenario_id") REFERENCES "scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE);',
      'CREATE TABLE IF NOT EXISTS "scenario_geofences" ( "id" integer NOT NULL, "scenario_id" integer NOT NULL, "bookmark_id" integer NOT NULL, "identifier" text NOT NULL, "lat" text NOT NULL, "lng" text NOT NULL, "radius" integer NOT NULL, PRIMARY KEY("scenario_id","id"), CONSTRAINT "fk_scenario_geofences_scenarios_id" FOREIGN KEY ("scenario_id") REFERENCES "scenarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE);',
      'CREATE TABLE IF NOT EXISTS "settings" ( "key" text NOT NULL, "value" text);'
    ];

    let sql = (dropTables) ? sqlDrop.concat(sqlInsert) : sqlInsert;

    return sql;
  }
}
