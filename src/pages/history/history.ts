import { Component } from '@angular/core';
import { NavController, NavParams, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { TranslateService } from 'ng2-translate';

// Platform services
import { PlatformData } from '../../providers/platform-data';
import { PlatformScenario } from '../../providers/platform-scenario';

@Component({
  selector: 'page-history',
  templateUrl: 'history.html'
})
export class HistoryPage {
  items: Array<{id: number, title: string, url: string, icon: string}>;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private storage: Storage,
    private platformData: PlatformData,
    private alertCtrl: AlertController,
    private platformScenario: PlatformScenario,
    private translate: TranslateService
  ) {
    // Set current page
    this.storage.set('page', 'history');

    this.loadHistory(false);
  }

  loadHistory(refresher) {
    this.items = [];

    this.platformData.getHistory()
    .then((history) => {
      console.log(history);
      if(Object.keys(history).length) {
        for(let i = 0; i < Object.keys(history).length; i++) {

          let url = this.platformScenario.parseUrlFromScenario(history[i].scenario);

          let identifier = '<strong>' + history[i].identifier + '</strong>';
          let title = '';
          let icon = '';

          switch(parseInt(history[i].scenario_if_id)){
            case 1: title = this.translate.instant('ENTERED_REGION', {beacon_or_geofence: identifier}); icon = 'assets/images/state-icons/enter.svg'; break;
            case 2: title = this.translate.instant('EXITED_REGION', {beacon_or_geofence: identifier}); icon = 'assets/images/state-icons/leave.svg'; break;
            case 3: title = this.translate.instant('CAME_IN_RANGE', {beacon: identifier}); icon = 'assets/images/state-icons/far.svg'; break;
            case 4: title = this.translate.instant('CAME_NEAR', {beacon: identifier}); icon = 'assets/images/state-icons/near.svg'; break;
            case 5: title = this.translate.instant('CAME_CLOSE', {beacon: identifier}); icon = 'assets/images/state-icons/immediate.svg'; break;
          }

          this.items.push({
            id: history[i].id,
            title: title,
            url: url,
            icon: icon
          });
        }
      }
      if (refresher !== false) {
        refresher.complete();
      }
    });
  }

  openHistory(event, item) {
    console.log('openHistory');
    this.platformScenario.openWebView(item.url);
  }

  deleteHistory(id) {
    let confirm = this.alertCtrl.create({
      title: this.translate.instant('CONFIRM'),
      message: this.translate.instant('CONFIRM_DELETE'),
      buttons: [
        {
          text: this.translate.instant('CANCEL'),
          handler: () => {
            console.log('Disagree clicked');
          }
        },
        {
          text: this.translate.instant('OK'),
          handler: () => {
            this.platformData.deleteHistory(id);
            this.loadHistory(false);
          }
        }
      ]
    });
    confirm.present();
  }

  ionViewDidLoad() {
    console.log('Hello History Page');
  }
}
