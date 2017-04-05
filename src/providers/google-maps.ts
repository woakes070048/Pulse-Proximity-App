import { Injectable } from '@angular/core';
import { Connectivity } from './connectivity';

import * as AppConfig from '../appConfig';

declare var google;

@Injectable()
export class GoogleMaps {

  mapElement: any;
  pleaseConnect: any;
  map: any;
  mapInitialised: boolean = false;
  mapLoaded: any;
  mapLoadedObserver: any;
  markers: any = [];
  lat: number;
  lng: number;
  zoom: number;
  apiKey: string = AppConfig.data.google_maps_key;

  constructor(public connectivityService: Connectivity) {

  }

  init(mapElement: any, pleaseConnect: any, lat: number, lng: number, zoom: number): Promise<any> {
    this.mapElement = mapElement;
    this.pleaseConnect = pleaseConnect;
    this.lat = lat;
    this.lng = lng;
    this.zoom = zoom;

    return this.loadGoogleMaps();
  }

  loadGoogleMaps(): Promise<any> {
    return new Promise((resolve) => {
      if(typeof google == "undefined" || typeof google.maps == "undefined"){
        console.log("Google maps JavaScript needs to be loaded.");
        this.disableMap();

        if(this.connectivityService.isOnline()){

          window['mapInit'] = () => {
            this.initMap().then(() => {
              resolve(true);
            });

            this.enableMap();
          }

          let script = document.createElement("script");
          script.id = "googleMaps";

          if(this.apiKey){
            script.src = 'http://maps.google.com/maps/api/js?key=' + this.apiKey + '&callback=mapInit';
          } else {
            script.src = 'http://maps.google.com/maps/api/js?callback=mapInit';
          }

          document.body.appendChild(script);
        }
      } else {
        if(this.connectivityService.isOnline()){
          this.initMap();
          this.enableMap();
        } else {
          this.disableMap();
        }
      }
      this.addConnectivityListeners();

    });
  }

  initMap(): Promise<any> {
    this.mapInitialised = true;

    return new Promise((resolve) => {
      let latLng = new google.maps.LatLng(this.lat, this.lng);

      //let latLng = new google.maps.LatLng(40.713744, -74.009056);

      let mapOptions = {
        center: latLng,
        zoom: this.zoom,
        draggable: false,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      }

      this.map = new google.maps.Map(this.mapElement, mapOptions);

      let marker = new google.maps.Marker({
        map: this.map,
        animation: google.maps.Animation.DROP,
        position: latLng
      });

      resolve(true);
    });
  }

  disableMap(): void {
    if(this.pleaseConnect){
      this.pleaseConnect.style.display = "block";
    }
  }

  enableMap(): void {
    if(this.pleaseConnect){
      this.pleaseConnect.style.display = "none";
    }
  }

  addConnectivityListeners(): void {
    document.addEventListener('online', () => {
      console.log("online");
      setTimeout(() => {
        if(typeof google == "undefined" || typeof google.maps == "undefined"){
          this.loadGoogleMaps();
        }
        else {
          if(!this.mapInitialised){
            this.initMap();
          }
          this.enableMap();
        }
      }, 2000);
    }, false);

    document.addEventListener('offline', () => {
      console.log("offline");
      this.disableMap();
    }, false);
  }

  addMarker(lat: number, lng: number): void {
    let latLng = new google.maps.LatLng(lat, lng);

    let marker = new google.maps.Marker({
      map: this.map,
      animation: google.maps.Animation.DROP,
      position: latLng
    });

    this.markers.push(marker);
  }
}
