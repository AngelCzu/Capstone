import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ToastOptions, } from '@ionic/angular';
import { AlertController } from '@ionic/angular';

import { ModalController } from '@ionic/angular';
import { ConfirmSheetComponent } from '../shared/component/confirm-sheet/confirm-sheet.component';

@Injectable({
  providedIn: 'root'
})
export class Utils {

  loandinCtrl = inject(LoadingController);
  toastCtrl = inject(ToastController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  

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

  //================ Presentar prompt para contraseña ===============================
  async presentPasswordPrompt(opts: {
    header?: string;
    message?: string;
  }): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: opts.header || 'Confirmar',
        message: opts.message || 'Ingresa tu contraseña',
        inputs: [
          {
            name: 'password',
            type: 'password',
            placeholder: 'Contraseña'
          }
        ],
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(null)
          },
          {
            text: 'Aceptar',
            handler: (data) => {
              resolve(data.password || null);
            }
          }
        ]
      });

      await alert.present();
    });
  }


  //================ Presentar confirmación ===============================


async presentConfirmSheet(opts: {
  title: string,
  message: string,
  confirmText?: string,
  cancelText?: string,
  color?: string,
  icon?: string
}): Promise<boolean> {
  const modal = await this.modalCtrl.create({
  component: ConfirmSheetComponent,
  componentProps: opts,
  breakpoints: [0, 0.45],
  initialBreakpoint: 0.45,
  handle: true,
  backdropDismiss: true, // 👉 permite cerrar al presionar fuera
  cssClass: 'confirm-sheet-modal' // 👉 para aplicar estilos globales
});


  await modal.present();
  const { data } = await modal.onDidDismiss();
  return data ?? false;
}

}








