import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';

import { Device } from '@ionic-native/device';

// Global vars
import { GlobalVars } from '../providers/global-vars';

@Injectable()
export class PlatformDevice {

  constructor(
    public http: Http,
    private globalVars: GlobalVars,
    private device: Device
  ) {
  }

  /*
   * Get device info and save to global settings
   */
  getDevice() {
    return new Promise((resolve, reject) => {
      this.globalVars.setDevice(this.device);
      resolve(this.device);
    });
  }
}
