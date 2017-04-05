import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { IonicStorageModule } from '@ionic/storage';
import { Http } from '@angular/http';
import { TranslateModule, TranslateStaticLoader, TranslateLoader } from 'ng2-translate/ng2-translate';

// Ionic Native
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { SafariViewController } from '@ionic-native/safari-view-controller';
import { Geofence } from '@ionic-native/geofence';
import { IBeacon } from '@ionic-native/ibeacon';
import { Device } from '@ionic-native/device';
import { Geolocation } from '@ionic-native/geolocation';
import { Network } from '@ionic-native/network';

// Providers
import { GlobalVars } from '../providers/global-vars';
import { GoogleMaps } from '../providers/google-maps';
import { Connectivity } from '../providers/connectivity';

// Pages
import { PreferencesPage } from '../pages/preferences/preferences';
import { PrivacyPopoverContent } from '../pages/preferences/preferences';
import { CardPage } from '../pages/card/card';
import { FavoritesPage } from '../pages/favorites/favorites';
import { NearbyPage } from '../pages/nearby/nearby';
import { HistoryPage } from '../pages/history/history';

export function createTranslateLoader(http: Http) {
  return new TranslateStaticLoader(http, 'assets/i18n', '.json');
}

@NgModule({
  declarations: [
    MyApp,
    PreferencesPage,
    PrivacyPopoverContent,
    CardPage,
    FavoritesPage,
    NearbyPage,
    HistoryPage
  ],
  imports: [
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot({
      name: '__storage',
         driverOrder: ['indexeddb', 'sqlite', 'websql']
    }),
    TranslateModule.forRoot({
      provide: TranslateLoader,
      useFactory: (createTranslateLoader),
      deps: [Http]
    })
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    PreferencesPage,
    PrivacyPopoverContent,
    CardPage,
    FavoritesPage,
    NearbyPage,
    HistoryPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    GlobalVars,
    GoogleMaps,
    LocalNotifications,
    SafariViewController,
    Geofence,
    IBeacon,
    Device,
    Geolocation,
    Network,
    Connectivity
  ]
})
export class AppModule {}
