import { Component, ElementRef, ViewChild } from '@angular/core';
import { Platform, LoadingController, NavController, NavParams, Events } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { TranslateService } from 'ng2-translate';
import { Http, Headers, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/retry';
import 'rxjs/add/operator/timeout';
import 'rxjs/add/operator/map';

import * as AppConfig from '../../appConfig';

// Global vars
import { GlobalVars } from '../../providers/global-vars';

// Services
import { PlatformGeolocation } from '../../providers/platform-geolocation';
import { GoogleMaps } from '../../providers/google-maps';

@Component({
  selector: 'page-card',
  templateUrl: 'card.html'
})
export class CardPage {

  @ViewChild('map') mapElement: ElementRef;
  @ViewChild('pleaseConnect') pleaseConnect: ElementRef;

  sl: string;
  parentPage: any;
  loader: any;
  favorite: boolean = false;
  favorites: any;
  card_loading: boolean = true;
  card: any = {
    name: '',
    image: '',
    description: '',
    content: ''
  };

  constructor(
    public events: Events,
    public maps: GoogleMaps,
    public platform: Platform,
    public navCtrl: NavController,
    public navParams: NavParams,
    private loadingCtrl: LoadingController,
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

    this.sl = navParams.get("sl");
    this.parentPage = navParams.get("parentPage");

    this.loadCard();
  }

  loadCard() {
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
        sl: this.sl,
        lang: this.translate.currentLang,
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

      this.http.post(AppConfig.data.platform_url + '/api/v1/remote/card', body, options)
      .timeout(5000)
      .retry(0)
      .map(res => res.json())
      .subscribe(data => {
        console.log(data);
        this.card = data;
        this.card_loading = false;
        this.loader.dismiss();

        let mapLoaded = this.maps.init(this.mapElement.nativeElement, this.pleaseConnect.nativeElement, this.card.lat, this.card.lng, this.card.zoom);

        // Check if card is favorite
        this.storage.get('favorites').then((data) => {
          if (data != null) {
            this.favorites = JSON.parse(data);
            // Check if fav already exists
            if(Object.keys(this.favorites).length) {
              for(let i = 0; i < Object.keys(this.favorites).length; i++) {
                if (this.favorites[i].id == this.card.id) {
                  this.favorite = true;
                }
              }
            }
          } else {
            this.favorites = [];
          }
        });
      },
      err => {
        this.loader.dismiss();
        alert(this.translate.instant('ERROR_LOADING_DATA'));
      });
    },
      err => { alert(this.translate.instant('COULD_NOT_RETRIEVE_LOCATION')); }
    );
  }

  favoriteCard() {
    let favorite = [{
      id: this.card.id,
      sl: this.sl,
      name: this.card.name,
      description: this.card.description,
      icon: this.card.icon
    }];

    if (! this.favorite) {
      this.favorites.push.apply(this.favorites, favorite);
      this.storage.set('favorites', JSON.stringify(this.favorites));
      this.favorite = true;

      // Update favs page
      if (typeof this.parentPage.loadFavs === "function") {
        this.parentPage.loadFavs(false);
      }

      console.log(this.translate.instant('FAVORITE_SUCCESS'));
    } else {
      alert(this.translate.instant('FAVORITE_EXISTS'));
    }
  }

  unfavoriteCard () {
    if (this.favorite) {
      if(Object.keys(this.favorites).length) {
        for(let i = 0; i < Object.keys(this.favorites).length; i++) {
          if (this.favorites[i].id == this.card.id) {
            this.favorites.splice(i, 1);
            this.storage.set('favorites', JSON.stringify(this.favorites));
            this.favorite = false;

            // Update favs page
            if (typeof this.parentPage.loadFavs === "function") {
              this.parentPage.loadFavs(false);
            }
          }
        }
      }
    }
  }

  ionViewDidLoad() {
  }
}
