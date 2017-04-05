import { Component } from '@angular/core';
import { NavController, NavParams, AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { TranslateService } from 'ng2-translate';

// Pages
import { CardPage } from '../card/card';

@Component({
  selector: 'page-favorites',
  templateUrl: 'favorites.html'
})
export class FavoritesPage {
  cards: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private storage: Storage,
    private alertCtrl: AlertController,
    private translate: TranslateService
  ) {
    this.loadFavs(false);

    // Set current page
    this.storage.set('page', 'favs');
  }

  viewCard(sl) {
    this.navCtrl.push(CardPage, {
      sl: sl,
      parentPage: this
    });
  }

  deleteFav(sl) {
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
            if(Object.keys(this.cards).length) {
              for(let i = 0; i < Object.keys(this.cards).length; i++) {
                console.log(i);
                if (this.cards[i].sl == sl) {
                  this.cards.splice(i, 1);
                  this.storage.set('favorites', JSON.stringify(this.cards));
                }
              }
            }
          }
        }
      ]
    });
    confirm.present();
  }

  loadFavs(refresher) {
    // Check for existing favorites
    this.storage.get('favorites').then((data) => {
      if (data != null) {
        this.cards = JSON.parse(data);
      }
    });

    if (refresher !== false) {
      refresher.complete();
    }
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad FavoritesPage');
  }
}
