import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ToastOptions } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class Utils {

  loandinCtrl = inject(LoadingController);
  toastCtrl = inject(ToastController);

  router = inject(Router);

  // ================================ Loading ================================
  loading() {
    return this.loandinCtrl.create({ spinner: 'crescent', message: 'Cargando...', });
  }


  // ================================ Toast ================================
  async presentToast(opts?: ToastOptions) {
    const toast = await this.toastCtrl.create(opts);
    toast.present();
  }


  // ================================ Navegación ================================
  routerLink(url: string) {
    return this.router.navigateByUrl(url);
  }



  //============ Guardar en localStorage ===============
  saveLocalStorage(key: string, value: any) {
    return localStorage.setItem(key, JSON.stringify(value));
  }

  //============ Obtener de localStorage ===============
  getLocalStorage(key: string) {
    return JSON.parse(localStorage.getItem(key));
  }

  //============ Eliminar de localStorage ==============
  removeLocalStorage(key: string) {
    return localStorage.removeItem(key);
  }



}
