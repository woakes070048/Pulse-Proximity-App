import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { IBeacon } from '@ionic-native/ibeacon';
import 'rxjs/add/operator/map';

// Platform services
import { PlatformData } from './platform-data';
import { PlatformScenario } from './platform-scenario';

@Injectable()
export class PlatformBeacons {

  private delegate: any;

  constructor(
    public http: Http,
    private platformData: PlatformData,
    private platformScenario: PlatformScenario,
    private ibeacon: IBeacon
  ) {
  }

  /*
   * Initialize plugin
   */
  init() {
    return new Promise((resolve, reject) => {
      // Request permission to use location on iOS
      this.ibeacon.requestAlwaysAuthorization();

      // create a new delegate and register it with the native layer
      this.delegate = this.ibeacon.Delegate();

      this.listenToBeacons();

      resolve(this.delegate);
    });
  }

  /*
   * Stop listening to all beacons
   */
  removeAllListeners() {
    return new Promise((resolve, reject) => {
/*
      this.ibeacon.getMonitoredRegions()
      .then(
        (regions) => {
          if (regions.length > 0) {
            for (let i = 0; i < regions.length; ++i) {
              this.delegate.stopMonitoringForRegion(regions[i]);
            }
          }
        },
        error => console.error('Get monitored regions failed: ', error)
      );
*/
      return this.ibeacon.getRangedRegions()
      .then(
        (regions) => {
          if (regions.length > 0) {
            for (let i = 0; i < regions.length; ++i) {
              this.ibeacon.stopRangingBeaconsInRegion(regions[i] as any);
            }
          }
          resolve(true);
        },
        error => console.error('Get ranged regions failed: ', error)
      );
    });
  }

  /*
   * Subscribe to beacons
   *
   * If beaconsToSubscribe is NULL, the data is retrieved from the database.
   * If it's not NULL, it's is an object that looks like this:

   beaconsToSubscribe = {
     identifier: "b4",
     major: 10005,
     minor: 54480,
     uuid: "fda50693-a4e2-4fb1-afcf-c6eb07647825"
   }, {
     identifier: "b85",
     major: 38012,
     minor: 38576,
     uuid: "B9407F30-F5F8-466E-AFF9-25556B57FE6D"
   }

   */
  subscribeToBeacons(beaconsToSubscribe = null) {
    return new Promise((resolve, reject) => {
  		if (beaconsToSubscribe === null) {
				this.platformData.db.executeSql("SELECT * FROM scenario_beacons GROUP BY id;", [])
        .then((result) => {
					if (result.rows.length > 0) {
						for (let i = 0; i < result.rows.length; ++i) {
							let beacon = {
								identifier: 'b' + String(result.rows.item(i).id),
								uuid: result.rows.item(i).uuid,
								major: result.rows.item(i).major,
								minor: result.rows.item(i).minor
							};

              console.log("Subscribe to beacon from db");
              console.log(beacon);

              let beaconRegion = this.ibeacon.BeaconRegion(
                beacon.identifier,
                beacon.uuid,
                beacon.major,
                beacon.minor
              );

              this.ibeacon.startMonitoringForRegion(beaconRegion)
              .then(
                () => console.log('Native layer recieved the request to monitoring'),
                error => console.error('Native layer failed to begin monitoring: ', error)
              );

              this.ibeacon.startRangingBeaconsInRegion(beaconRegion)
              .then(
                () => console.log('Native layer recieved the request to monitoring'),
                error => console.error('Native layer failed to begin monitoring: ', error)
              );
						}
						//this.listenToBeacons();
					}
				});
  		} else {
  			if (beaconsToSubscribe.length > 0) {
  				for (let i = 0; i < beaconsToSubscribe.length; ++i) {
  					let beacon = beaconsToSubscribe[i];

            console.log("Subscribe to beacon");
            console.log(beacon);

            let beaconRegion = this.ibeacon.BeaconRegion(
              beacon.identifier,
              beacon.uuid,
              beacon.major,
              beacon.minor
            );

            this.ibeacon.startMonitoringForRegion(beaconRegion)
            .then(
              () => console.log('Native layer recieved the request to monitoring'),
              error => console.error('Native layer failed to begin monitoring: ', error)
            );

            this.ibeacon.startRangingBeaconsInRegion(beaconRegion)
            .then(
              () => console.log('Native layer recieved the request to monitoring'),
              error => console.error('Native layer failed to begin monitoring: ', error)
            );
  				}
  				//this.listenToBeacons();
  			}
  		}

      resolve(true);
    });
  }

  listenToBeacons() {
    // Subscribe to some of the delegate's event handlers
    this.delegate.didRangeBeaconsInRegion()
    .subscribe(
      data => {
				if (typeof data.beacons !== 'undefined' && data.beacons.length > 0) {
					for (let i = 0; i < data.beacons.length; ++i) {
						let region = data.region;
						let beacon = data.beacons[i];
						let beacon_id = parseInt(region.identifier.substring(1, region.identifier.length));

						if (beacon.proximity != 'ProximityUnknown') {
							// Save state to db
							this.platformData.db.executeSql("SELECT * FROM beacon_ranging WHERE id = ?", [beacon_id])
              .then((result) => {

								let previous_proximity;
                let scenario_if_id;
								let previous_update = 0;
								let current_proximity = beacon.proximity;
								let can_trigger_scenario = 1;

								if (result.rows.length > 0) {
									can_trigger_scenario = parseInt(result.rows.item(0).can_trigger_scenario);
									previous_proximity = result.rows.item(0).current_proximity;
									previous_update = result.rows.item(0).updated;
									previous_update = previous_update + 5;
								}

								if (result.rows.length > 0 && previous_proximity != current_proximity && Date.now() >= previous_update) {
									can_trigger_scenario = 1;
								}

								//console.log('previous_proximity: ' + previous_proximity + ', current_proximity: ' + current_proximity + ', can_trigger_scenario: ' + can_trigger_scenario + ', previous_update: ' + previous_update);

								switch (current_proximity) {
									case 'ProximityImmediate':
										scenario_if_id = 5;
										break;
									case 'ProximityNear':
										scenario_if_id = 4;
										break;
									case 'ProximityFar':
										scenario_if_id = 3;
										break;
								}

                console.log('current_proximity: ' + current_proximity);
                console.log('can_trigger_scenario: ' + can_trigger_scenario);

								this.platformData.db.executeSql("INSERT OR REPLACE INTO beacon_ranging (id, current_proximity, previous_proximity, can_trigger_scenario, updated) VALUES (?, ?, ?, ?, ?);", [
										beacon_id,
										beacon.proximity,
										previous_proximity,
										can_trigger_scenario,
										Date.now()
									])
                .then((result) => {
									// Check if scenario should be triggered
									if (can_trigger_scenario == 1) {
										this.platformData.db.executeSql("SELECT s.*, i.count, sb.identifier, sb.id type_id FROM scenarios s, scenario_beacons sb LEFT JOIN interactions i ON i.id = s.id WHERE sb.id = ? AND sb.scenario_id = s.id AND s.scenario_if_id = ? AND ifnull(i.timer, 0) <= ?;", [beacon_id, scenario_if_id, Date.now()])
                    .then((result) => {
											if (result.rows.length > 0) {
												// We have a scenario, verify other conditions
												let scenario = result.rows.item(0);
												scenario.type = 'beacon';

												// Validate date / time conditions
												if (this.platformScenario.validateDateTimeConditions(scenario)) {
													// Insert & process interaction
													let now = Date.now();
													let timer = now + (scenario.frequency * 1); // Scenario can be retriggered after frequency * seconds
													let count = scenario.count++;

													let sqlQueries = [];

													sqlQueries.push(["INSERT OR REPLACE INTO interactions(id, bookmark_id, identifier, type, action, count, timer, created, updated) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?);", [scenario.id, scenario.bookmark_id, scenario.identifier, 'beacon', current_proximity, count, timer, now, now]]);
													sqlQueries.push(["UPDATE beacon_ranging SET can_trigger_scenario = ? WHERE id = ?;", [0, beacon_id]]);

													this.platformData.db.sqlBatch(sqlQueries).then((data) => {
														console.log('Interaction, scenario #' + scenario.id + ', beacon #' + beacon_id + ', bookmark #' + scenario.bookmark_id + ', proximity ' + beacon.proximity);
														// Parse and execute scenario
														this.platformScenario.parseScenario(scenario);
													}, function(error) {
														console.log('SQLite error: ' + error.message);
													});
												} // validateDateTimeConditions
											} // result.rows.length > 0
										}); // query
								  } // can_trigger_scenario
								}); // query
							}); // query
					  } // beacon.proximity != 'ProximityUnknown'
				  } // loop
			  } // data.beacons.length > 0
      },
      error => console.error()
    );

    this.delegate.didEnterRegion()
    .subscribe(
      data => {
        console.log('didEnterRegion: ', data);

				let beacon_id = data.region.identifier.substring(1, data.region.identifier.length);

				// Save state to db
				this.platformData.db.executeSql("SELECT * FROM beacon_monitoring WHERE id = ?", [beacon_id])
        .then((result) => {
          let scenario_if_id;
					let previous_state;
					let current_state = 'enter';
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
						case 'enter':
							scenario_if_id = 1;
							break;
						case 'exit':
							scenario_if_id = 2;
							break;
					}

					this.platformData.db.executeSql("INSERT OR REPLACE INTO beacon_monitoring (id, state, can_trigger_scenario, updated) VALUES (?, ?, ?, ?);", [
							beacon_id,
							'enter',
							can_trigger_scenario,
							Date.now()
						])
          .then((result) => {
						// Check if scenario should be triggered
						if (can_trigger_scenario == 1) {
							this.platformData.db.executeSql("SELECT s.*, i.count, sb.identifier, sb.id type_id FROM scenarios s, scenario_beacons sb LEFT JOIN interactions i ON i.id = s.id WHERE sb.id = ? AND sb.scenario_id = s.id AND s.scenario_if_id = ? AND ifnull(i.timer, 0) <= ?", [beacon_id, scenario_if_id, Date.now()])
              .then((result) => {
								if (result.rows.length > 0) {
									// We have a scenario, verify other conditions
									let scenario = result.rows.item(0);
									scenario.type = 'beacon';

									// Validate date / time conditions
									if (this.platformScenario.validateDateTimeConditions(scenario)) {
										// Insert & process interaction
										let now = Date.now();
										let timer = now + (scenario.frequency * 1); // Scenario can be retriggered after frequency * seconds
										let count = scenario.count++;

										let sqlQueries = [];

										sqlQueries.push(["INSERT OR REPLACE INTO interactions(id, bookmark_id, identifier, type, action, count, timer, created, updated) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?);", [scenario.id, scenario.bookmark_id, scenario.identifier, 'beacon', current_state, count, timer, now, now]]);
										sqlQueries.push(["UPDATE beacon_monitoring SET can_trigger_scenario = ? WHERE id = ?", [0, beacon_id]]);

										this.platformData.db.sqlBatch(sqlQueries).then((data) => {
											//console.log('Interaction, scenario #' + scenario.id + ', beacon #' + beacon_id + ', bookmark #' + scenario.bookmark_id + ', state ' + current_state);

											// Parse and execute scenario
											this.platformScenario.parseScenario(scenario);
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
    );

    this.delegate.didExitRegion()
    .subscribe(
      data => {
        console.log('didExitRegion: ', data);

        let beacon_id = data.region.identifier.substring(1, data.region.identifier.length);

				// Save state to db
				this.platformData.db.executeSql("SELECT * FROM beacon_monitoring WHERE id = ?", [beacon_id])
        .then((result) => {
          let scenario_if_id;
					let previous_state;
					let current_state = 'exit';
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
						case 'enter':
							scenario_if_id = 1;
							break;
						case 'exit':
							scenario_if_id = 2;
							break;
					}

					this.platformData.db.executeSql("INSERT OR REPLACE INTO beacon_monitoring (id, state, can_trigger_scenario, updated) VALUES (?, ?, ?, ?);", [
							beacon_id,
							'exit',
							can_trigger_scenario,
							Date.now()
						])
          .then((result) => {
						// Check if scenario should be triggered
						if (can_trigger_scenario == 1) {
							this.platformData.db.executeSql("SELECT s.*, i.count, sb.identifier, sb.id type_id FROM scenarios s, scenario_beacons sb LEFT JOIN interactions i ON i.id = s.id WHERE sb.id = ? AND sb.scenario_id = s.id  AND s.scenario_if_id = ? AND ifnull(i.timer, 0) <= ?", [beacon_id, scenario_if_id, Date.now()])
              .then((result) => {
								if (result.rows.length > 0) {
									// We have a scenario, verify other conditions
									let scenario = result.rows.item(0);
									scenario.type = 'beacon';

									// Validate date / time conditions
									if (this.platformScenario.validateDateTimeConditions(scenario)) {

										// Insert & process interaction
										let now = Date.now();
										let timer = now + (scenario.frequency * 1); // Scenario can be retriggered after frequency * seconds
										let count = scenario.count++;

										let sqlQueries = [];

										sqlQueries.push(["INSERT OR REPLACE INTO interactions(id, bookmark_id, identifier, type, action, count, timer, created, updated) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?);", [scenario.id, scenario.bookmark_id, scenario.identifier, 'beacon', current_state, count, timer, now, now]]);
										sqlQueries.push(["UPDATE beacon_monitoring SET can_trigger_scenario = ? WHERE id = ?", [0, beacon_id]]);

										this.platformData.db.sqlBatch(sqlQueries).then((data) => {
											//console.log('Interaction, scenario #' + scenario.id + ', beacon #' + beacon_id + ', bookmark #' + scenario.bookmark_id + ', state ' + current_state);

											// Parse and execute scenario
											this.platformScenario.parseScenario(scenario);
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
    );
  }
}
