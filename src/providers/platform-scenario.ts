import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { Platform } from 'ionic-angular';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { SafariViewController } from '@ionic-native/safari-view-controller';
import 'rxjs/add/operator/map';

import * as AppConfig from '../appConfig';

//import * as moment from "moment";
import moment from 'moment-timezone';

// Global vars
import { GlobalVars } from '../providers/global-vars';

@Injectable()
export class PlatformScenario {

  constructor(
    public http: Http,
    private localNotifications: LocalNotifications,
    private safariViewController: SafariViewController,
    private platform: Platform,
    private globalVars: GlobalVars
  ) {
  }

  openWebView(url: string) {
    this.safariViewController.isAvailable()
    .then(
      (available: boolean) => {
        if(available){

          this.safariViewController.show({
            url: url,
            hidden: false,
            animated: false,
            transition: 'curl',
            enterReaderModeIfAvailable: true,
            tintColor: '#ff0000'
          })
          .then(
            (result: any) => {
              if(result.event === 'opened') console.log('Opened');
              else if(result.event === 'loaded') console.log('Loaded');
              else if(result.event === 'closed') console.log('Closed');
            },
            (error: any) => console.error(error)
          );

        } else {
          // use fallback browser, example InAppBrowser
        }
      }
    );
  }

	executeScenario(scenario: any) {
		let open_url = this.parseUrlFromScenario(scenario);

		if (open_url != null) {
      this.openWebView(open_url);
		}

    // Get device info from global vars
    let device = this.globalVars.getDevice();

    // Get location info from global vars
    let location = this.globalVars.getLocation();

	  // Post scenario interaction data to server
		let state;
		switch (scenario.scenario_if_id) {
			case 1:
				state = 'enter';
				break;
			case 2:
				state = 'leave';
				break;
			case 3:
				state = 'far';
				break;
			case 4:
				state = 'near';
				break;
			case 5:
				state = 'immediate';
				break;
		}

    let headers = new Headers({
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    let options = new RequestOptions({
      headers: headers
    });

		let params = {
			token: scenario.token,
  		scenario_id: scenario.id,
			type_id: scenario.type_id,
			type: scenario.type,
			state: state,
			lat: location.latitude,
			lng: location.longitude,
			uuid: device.uuid,
			model: device.model,
			platform: device.platform
		};

    let str = [];

    for (var k in params) {
      str.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
    }

    let body = str.join("&");

    this.http.post(AppConfig.data.platform_url + '/api/v1/remote/scenario', body, options)
    .map(res => res.json())
    .subscribe(
      response => {
        console.log('Scenario posted');
      },
      err => {
        console.log('Could not connect to server, scenario not posted.')
      }
    );
	}

  parseScenario(scenario) {
    var that = this;
		console.log('parseScenario');

		// Local push notification
		if (this.platform.is('android')) scenario.notification = scenario.notification.replace(/%%/g, '%');

    this.localNotifications.schedule({
      id: scenario.id,
      text: scenario.notification,
      at: Date.now() + (parseInt(scenario.delay) * 1000),
      data: { scenario: scenario }
    });

    this.localNotifications.on("click", function (notification) {
      console.log('LocalNotification clicked');
      let scenario = JSON.parse(notification.data);
      that.executeScenario(scenario.scenario);
    });

		this.executeScenario(scenario);
  }

	parseUrlFromScenario(scenario) {
		let open_url, api;

    if (typeof scenario.scenario !== 'undefined') {
      api = JSON.parse(scenario.scenario);
    } else if (typeof scenario !== 'object') {
      api = JSON.parse(scenario);
    } else {
      api = scenario;
    }

		/**
		 * show_image
		 */

		if (api.scenario_then_id == 2) {
			open_url = api.show_image;
		}

		/**
		 * show_template
		 */

		if (api.scenario_then_id == 3) {
			open_url = api.template;
		}

		/**
		 * open_url
		 */

		if (api.scenario_then_id == 4) {
			open_url = api.open_url;
		}

		return open_url;
	}

  validateDateTimeConditions(scenario) {
    	// Check for valid day
  		let valid_day = false;
  		let current_day_of_week = moment().tz(scenario.timezone).day();

  		if (scenario.scenario_day_id == 1) valid_day = true; // every_day
  		if (scenario.scenario_day_id == 3 && (current_day_of_week == 6 || current_day_of_week == 7)) valid_day = true; // saturday_and_sunday
  		if (scenario.scenario_day_id == 4 && (current_day_of_week == 5 || current_day_of_week == 6)) valid_day = true; // friday_and_saturday
  		if (scenario.scenario_day_id == 5 && (current_day_of_week >= 1 && current_day_of_week <= 5)) valid_day = true; // monday_to_friday
  		if (scenario.scenario_day_id == 6 && ((current_day_of_week >= 1 && current_day_of_week <= 4) || current_day_of_week == 7)) valid_day = true; // sunday_to_thursday
  		if (scenario.scenario_day_id == 7 && current_day_of_week == 1) valid_day = true; // monday
  		if (scenario.scenario_day_id == 8 && current_day_of_week == 2) valid_day = true; // tuesday
  		if (scenario.scenario_day_id == 9 && current_day_of_week == 3) valid_day = true; // wednesday
  		if (scenario.scenario_day_id == 10 && current_day_of_week == 4) valid_day = true; // thursday
  		if (scenario.scenario_day_id == 11 && current_day_of_week == 5) valid_day = true; // friday
  		if (scenario.scenario_day_id == 12 && current_day_of_week == 6) valid_day = true; // saturday
  		if (scenario.scenario_day_id == 13 && current_day_of_week == 7) valid_day = true; // sunday

  		// Between two dates
  		if (scenario.scenario_day_id == 2) {
  			let current_date = moment(moment().tz(scenario.timezone).format('YYYY-MM-DD HH:mm:ss'));
  			let date_start = moment(scenario.date_start).startOf('day');
  			let date_end = moment(scenario.date_end).endOf('day');

  			if (current_date.isBefore(date_end) && date_start.isBefore(current_date)) valid_day = true; // between_two_dates
  		}

  		// Check for valid time
  		let valid_time = false;

  		if (scenario.scenario_time_id == 1) valid_time = true; // all_the_time

  		// Between two times
  		if (scenario.scenario_time_id == 2) {
  			let current_date = moment(moment().tz(scenario.timezone).format('YYYY-MM-DD HH:mm:ss'));
  			let time_start = moment(scenario.time_start, 'HH:mm:ss');
  			let time_end = moment(scenario.time_end, 'HH:mm:ss');

  			if (current_date.isBefore(time_end) && time_start.isBefore(current_date)) valid_time = true; // between_two_times
  		}

  		return (valid_day && valid_time) ? true : false;
  }
}
