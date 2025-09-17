import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ToastOptions, } from '@ionic/angular';
import { AlertController } from '@ionic/angular';

import { ModalController } from '@ionic/angular';
import { ConfirmDialogComponent } from '../shared/component/confirm-dialog/confirm-dialog.component';
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


async presentCustomConfirm(opts: {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> {
 const modal = await this.modalCtrl.create({
  component: ConfirmDialogComponent,
  cssClass: 'confirm-modal',
  componentProps: {
    title: opts.title || 'Confirmar',
    message: opts.message,
    confirmText: opts.confirmText || 'Aceptar',
    cancelText: opts.cancelText || 'Cancelar'
  },
  backdropDismiss: true,        // permite cerrarlo tocando fuera
  initialBreakpoint: 0.4,       // altura inicial (40% pantalla)
  breakpoints: [0, 0.4, 0.8, 1] // posiciones a las que se puede arrastrar
});

  await modal.present();
  const { data } = await modal.onDidDismiss<boolean>();
  return data ?? false;
}

}








