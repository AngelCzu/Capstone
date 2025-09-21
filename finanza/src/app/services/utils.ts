import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ToastOptions, } from '@ionic/angular';
import { AlertController } from '@ionic/angular';

import { ModalController } from '@ionic/angular';
import { ConfirmSheetComponent } from '../shared/component/confirm-sheet/confirm-sheet.component';
import { EmailPinModalComponent } from '../shared/component/email-pin-modal/email-pin-modal.component';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Utils {

  loandinCtrl = inject(LoadingController);
  toastCtrl = inject(ToastController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  

  router = inject(Router);
  http= inject(HttpClient);

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
    return this.router.navigateByUrl(url, { replaceUrl: true });
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
  backdropDismiss: true, //  permite cerrar al presionar fuera
  cssClass: 'confirm-sheet-modal' //  para aplicar estilos globales
});


  await modal.present();
  const { data } = await modal.onDidDismiss();
  return data ?? false;
}

//================ Presentar modal ===============================
// PIN (cambiar correo)
async presentPinSheet(opts: {
  email: string,
  title?: string,
  message?: string,
  length?: number,
  ttlSec?: number
}): Promise<string | null> {
  const modal = await this.modalCtrl.create({ 
    component: EmailPinModalComponent,
    componentProps: {
      email: opts.email,                                                           // email al que se envió el PIN                  
      title: opts.title || 'Verificación de correo',                               // título por defecto
      message: opts.message || `Introduce el código que enviamos a ${opts.email}`, // mensaje por defecto
      length: opts.length || 6,                                                    // longitud del PIN, por defecto 6 dígitos
      ttlSec: opts.ttlSec || 300                                                   // tiempo para que caduque el PIN (en segundos), por defecto 300 (5 min)
    },
    breakpoints: [0.57],       // igual que confirm
    initialBreakpoint: 0.6,      //  misma altura
    handle: true,
    backdropDismiss: true,
    cssClass: 'confirm-sheet-modal'
  });


  

  await modal.present();
 // 👇 interceptamos el cierre definitivo
  const { data, role } = await modal.onDidDismiss();

  if (role === 'backdrop') {
    // 👇 si se cerró por tap afuera, hacemos cancel aquí
    try {
      await firstValueFrom(this.http.post('/api/v1/users/me/email-change/cancel', {}));
      await this.presentToast({
        message: 'Operación cancelada',
        duration: 1500,
        color: 'medium'
      });
    } catch (e: any) {
      await this.presentToast({
        message: e.error?.error || 'Error al cancelar',
        duration: 1500,
        color: 'danger'
      });
    }
    return null;
  }
  return data?.code ?? null;
}
}








