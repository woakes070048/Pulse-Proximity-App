import { Component } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/retry';
import 'rxjs/add/operator/timeout';
import { PopoverController, NavController, ViewController, LoadingController, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { TranslateService } from 'ng2-translate';

import * as AppConfig from '../../appConfig';

@Component({
  template: `
    <ion-content>
      <div padding style="text-align: center;" [innerHTML]="this.translate.instant('PRIVACY_POLICY_TEXT')">
      </div>
    </ion-content>
  `
})

export class PrivacyPopoverContent {
  constructor(
    public viewCtrl: ViewController,
    private translate: TranslateService
  ) {

  }

  close() {
    this.viewCtrl.dismiss();
  }
}

@Component({
  selector: 'page-preferences',
  templateUrl: 'preferences.html'
})

export class PreferencesPage {
  loader: any;
  categories: any;
  public preferences_tab: string = 'general';

  public preferences = {
    first_name: null,
    last_name: null,
    email: null,
    gender: null,
    birthday: null,
    interests: {}
  }

  constructor(
    public loadingCtrl: LoadingController,
    public navCtrl: NavController,
    private http: Http,
    private storage: Storage,
    private popoverCtrl: PopoverController,
    private translate: TranslateService,
    private alertCtrl: AlertController
  ) {
    this.loader = this.loadingCtrl.create({
      content: this.translate.instant('LOADER')
    });
    this.loader.present();

    // Check for existing preferences
    this.storage.get('preferences').then((data) => {
      if (data != null) {
        this.preferences = JSON.parse(data);
      }
    });

    // Set current page
    this.storage.set('page', 'preferences');

    this.loadInterests();
  }

  loadInterests() {
    this.http.get(AppConfig.data.platform_url + '/api/v1/remote/categories?lang=' + this.translate.currentLang).timeout(10000).retry(2).map(res => res.json()).subscribe(data => {

      // Set preferences interests
      if (data.length > 0) {
        for (let i = 0; i < data.length; ++i) {
          if (! this.preferences.interests.hasOwnProperty(data[i].id)) {
            this.preferences.interests[data[i].id] = true;
          }
        }
      }

      this.categories = data;
      this.loader.dismiss();
    },
    err => {
      this.loader.dismiss();
      alert(this.translate.instant('ERROR_LOADING_DATA'));
    });
  }

  updatePreferences() {
    console.log(JSON.stringify(this.preferences));
    this.storage.set('preferences', JSON.stringify(this.preferences));
  }

  showPrivacyPopover(event) {
    let alert = this.alertCtrl.create({
      title: this.translate.instant('PRIVACY_POLICY'),
      subTitle: this.translate.instant('PRIVACY_POLICY_TEXT'),
      buttons: [this.translate.instant('OK')]
   });
   alert.present();
/*
 	   let popover = this.popoverCtrl.create(PrivacyPopoverContent);

     let ev = {
       target : {
         getBoundingClientRect : () => {
           return {
             left: '10'
           };
         }
       }
     };

     popover.present({
       ev: ev
     });
     */
   }

  ionViewDidLoad() {
    console.log('Hello PreferencesPage Page');
  }

}
