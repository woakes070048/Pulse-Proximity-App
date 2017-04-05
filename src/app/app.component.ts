import { Component, ViewChild } from '@angular/core';
import { Platform, MenuController, Nav } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Storage } from '@ionic/storage';
import { TranslateService } from 'ng2-translate/ng2-translate';
import { Geofence } from '@ionic-native/geofence';

// Pages
import { PreferencesPage } from '../pages/preferences/preferences';
import { NearbyPage } from '../pages/nearby/nearby';
import { FavoritesPage } from '../pages/favorites/favorites';
import { HistoryPage } from '../pages/history/history';

// Platform services
import { PlatformService } from '../providers/platform-service';
import { PlatformData } from '../providers/platform-data';
import { PlatformGeolocation } from '../providers/platform-geolocation';
import { PlatformBeacons } from '../providers/platform-beacons';
import { PlatformApi } from '../providers/platform-api';
import { PlatformDevice } from '../providers/platform-device';
import { PlatformScenario } from '../providers/platform-scenario';

@Component({
  templateUrl: 'app.html',
  providers: [
    PlatformService,
    PlatformData,
    PlatformGeolocation,
    PlatformBeacons,
    PlatformApi,
    PlatformDevice,
    PlatformScenario
  ]
})

export class MyApp {
  @ViewChild(Nav) nav: Nav;

  public rootPage: any;
  pages: Array<{title: string, icon: string, component: any}>;

  constructor(
    public platform: Platform,
    public statusBar: StatusBar,
    public splashScreen: SplashScreen,
    public menu: MenuController,
    private storage: Storage,
    private platformService: PlatformService, // Proximity Platform
    private platformScenario: PlatformScenario,
    private platformGeolocation: PlatformGeolocation,
    private translate: TranslateService,
    private geofence: Geofence
  ) {
    // Check starting page
    this.storage.get('page').then((data) => {
      switch(data) {
        case 'nearby': this.rootPage = NearbyPage; break;
        case 'favs': this.rootPage = FavoritesPage; break;
        case 'history': this.rootPage = HistoryPage; break;
        default: this.rootPage = PreferencesPage;
      }
    });

    this.initializeApp();
    this.translateConfig();

    this.translate.get('NEARBY').subscribe(
      value => {
        // Translations are available now
        // set our app's pages
        this.pages = [
          { title: this.translate.instant('NEARBY'), icon: 'pin', component: NearbyPage },
          { title: this.translate.instant('FAVORITES'), icon: 'heart', component: FavoritesPage },
          { title: this.translate.instant('SPOTS'), icon: 'compass', component: HistoryPage },
          { title: this.translate.instant('PREFERENCES'), icon: 'contact', component: PreferencesPage }
        ];
      }
    )
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      // Proximity Platform
      this.platformService.init();

      // Listen for background geofence notifications
      // Android only
    	if (this.platform.is('android')) {
        this.geofence.onNotificationClicked()
        .subscribe(notificationData => {
          console.log('App opened from Geo Notification!', notificationData);

          // Get location and execute scenario
          this.platformGeolocation.getLocation()
          .then((location: any) => {
            this.platformScenario.executeScenario(notificationData.scenario);
          });
        });
      }
    });
  }

  translateConfig() {
    let userLang = navigator.language.split('-')[0]; // use navigator lang if available
    userLang = /(pt|en|nl)/gi.test(userLang) ? userLang : 'en';

    // this language will be used as a fallback when a translation isn't found in the current language
    this.translate.setDefaultLang('en');

    // the lang to use, if the lang isn't available, it will use the current loader to get them
    this.translate.use(userLang);
  }

  openPage(page) {
    // close the menu when clicking a link from the menu
    this.menu.close();
    // navigate to the new page if it is not the current page
    //   this.nav.push(page.component);
    this.nav.setRoot(page.component);
  }
}
