import { Injectable } from '@angular/core';

@Injectable()
export class GlobalVars {
  device: any;
  location: any;

  constructor() {
  }

  /*
   * Set device object
   */
  setDevice(value) {
    this.device = value;
  }

  /*
   * Get device object
   */
  getDevice() {
    return this.device;
  }

  /*
   * Set location.latitude & location.longitude
   */
  setLocation(value) {
    this.location = value;
  }

  /*
   * Get location.latitude & location.longitude
   */
  getLocation() {
    return this.location;
  }
}
