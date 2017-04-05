import { Component } from '@angular/core';
import { LoadingController, Nav } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { Http } from '@angular/http';
import 'rxjs/add/operator/retry';
import 'rxjs/add/operator/timeout';
import { TranslateService } from 'ng2-translate';

// Pages
import { CardPage } from '../card/card';

import * as AppConfig from '../../appConfig';

// Global vars
import { GlobalVars } from '../../providers/global-vars';

// Platform services
import { PlatformGeolocation } from '../../providers/platform-geolocation';

@Component({
  selector: 'page-nearby',
  templateUrl: 'nearby.html'
})
export class NearbyPage {
  loader: any;
  interests: string = '';
  page: number = 1;
  cards: any;
  location: any;
  scroll_finished: boolean = false;

  constructor(
    public loadingCtrl: LoadingController,
    private nav: Nav,
    private globalVars: GlobalVars,
    private http: Http,
    private storage: Storage,
    private platformGeolocation: PlatformGeolocation,
    private translate: TranslateService
  ) {
    this.loader = this.loadingCtrl.create({
      content: "Please wait..."
    });

    this.loader.present();

    // Check for existing preferences
    this.storage.get('preferences').then((data) => {
      if (data != null) {
        let preferences = JSON.parse(data);
        for (var interest in preferences.interests) {
          this.interests += interest + ',';
        }
      }
      this.loadCards(false, this.page);
    });

    // Set current page
    this.storage.set('page', 'nearby');
  }

  loadCards(refresher, page) {
    if (refresher !== false) {
      this.page = 1;
    }

    this.platformGeolocation.getLocation()
    .then((location: any) => {
      this.location = location;
      let qs = 'lang=' + this.translate.currentLang + '&token=' + AppConfig.data.api_token[0] + '&lat=' + this.location.latitude + '&lng=' + this.location.longitude + '&acc=' + Math.round(this.location.accuracy) + '&p=' + this.page + '&c=' + this.interests;
      console.log(qs);

      this.http.get(AppConfig.data.platform_url + '/api/v1/remote/cards?' + qs)
      .timeout(10000)
      .retry(2)
      .map(res => res.json())
      .subscribe(data => {
        console.log(data);
        this.cards = data;
        this.loader.dismiss();
        if (refresher !== false) {
          refresher.complete();
        }
      },
      err => {
        this.loader.dismiss();
        if (refresher !== false) {
          refresher.complete();
        }
        alert(this.translate.instant('ERROR_LOADING_DATA'));
      });
    },
      err => { alert(this.translate.instant('COULD_NOT_RETRIEVE_LOCATION')); }
    );
  }

  loadMoreCards(infiniteScroll) {
    if (this.scroll_finished) {
        infiniteScroll.complete();
        return;
    }

    this.page++;
    let qs = 'lang=' + this.translate.currentLang + '&token=' + AppConfig.data.api_token[0] + '&lat=' + this.location.latitude + '&lng=' + this.location.longitude + '&acc=' + Math.round(this.location.accuracy) + '&p=' + this.page + '&c=' + this.interests;
    console.log(qs);

    this.http.get(AppConfig.data.platform_url + '/api/v1/remote/cards?' + qs)
    .timeout(10000)
    .retry(2)
    .map(res => res.json())
    .subscribe(data => {
      if (data.length > 0) {
        this.cards.push.apply(this.cards, data);
      } else {
        this.scroll_finished = true;
      }
      infiniteScroll.complete();
    },
    err => {
      infiniteScroll.complete();
      alert(this.translate.instant('ERROR_LOADING_DATA'));
    });
  }

  viewCard(sl) {
    this.nav.push(CardPage, {
      sl: sl,
      parentPage: this
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad NearbyPage');
  }

}
