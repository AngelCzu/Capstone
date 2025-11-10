import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ToastOptions, AlertController, ModalController } from '@ionic/angular';
import { ConfirmSheetComponent } from '../shared/component/confirm-sheet/confirm-sheet.component';
import { EmailPinModalComponent } from '../shared/component/email-pin-modal/email-pin-modal.component';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { GenericModalComponent } from '../shared/component/modal-generic/modal-generic.component';

@Injectable({
  providedIn: 'root'
})
export class Utils {
  loandinCtrl = inject(LoadingController);
  toastCtrl = inject(ToastController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  router = inject(Router);
  http = inject(HttpClient);

  // ================================ Loading ================================
  loading() {
    return this.loandinCtrl.create({ spinner: 'crescent', message: 'Cargando...' });
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

  // ================================ Storage ================================
  saveLocalStorage(key: string, value: any) {
    return localStorage.setItem(key, JSON.stringify(value));
  }
  getLocalStorage(key: string) {
    return JSON.parse(localStorage.getItem(key));
  }
  removeLocalStorage(key: string) {
    return localStorage.removeItem(key);
  }

  // ================================ Prompt ================================
  async presentPasswordPrompt(opts: { header?: string; message?: string; }): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: opts.header || 'Confirmar',
        message: opts.message || 'Ingresa tu contraseña',
        inputs: [{ name: 'password', type: 'password', placeholder: 'Contraseña' }],
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(null) },
          { text: 'Aceptar', handler: (data) => resolve(data.password || null) }
        ]
      });
      await alert.present();
    });
  }

// ================================ Confirm Sheet ================================
  async presentConfirmSheet(opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    color?: string;
    icon?: string;
    breakpoints?: number[];
    initialBreakpoint?: number;
    cssClass?: string;
    onBackdropRedirect?: string;  // ruta opcional
    utils?: any;                  // 🆕 se puede pasar el servicio Utils
  }): Promise<boolean | 'redirected'> { // 👈 devuelve un flag especial si redirige
    const modal = await this.modalCtrl.create({
      component: ConfirmSheetComponent,
      componentProps: opts,
      breakpoints: opts.breakpoints ?? [0, 0.45],
      initialBreakpoint: opts.initialBreakpoint ?? 0.45,
      handle: true,
      backdropDismiss: true,
      cssClass: opts.cssClass ?? 'confirm-sheet-modal',
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();

    // ✅ si toca fuera y hay ruta definida → redirigir
    if (role === 'backdrop' && opts.onBackdropRedirect) {
      try {
        const utils = opts.utils ?? this;
        if (typeof utils.routerLink === 'function') {
          utils.routerLink(opts.onBackdropRedirect);
        } else {
          console.warn('Utils no tiene routerLink disponible.');
        }
      } catch (e) {
        console.warn('No se pudo redirigir tras cerrar modal:', e);
      }
      return 'redirected'; // 👈 señal especial
    }

    return data ?? false;
  }





  // ================================ PIN Modal ================================
  async presentPinSheet(opts: {
    email: string;
    action: 'email-change' | 'delete-account' | string;
    title?: string;
    message?: string;
    length?: number;
    ttlSec?: number;
  }): Promise<string | null> {
    const modal = await this.modalCtrl.create({
      component: EmailPinModalComponent,
      componentProps: {
        email: opts.email,
        action: opts.action,
        title: opts.title || 'Verificación de seguridad',
        message: opts.message || `Introduce el código que enviamos a ${opts.email}`,
        length: opts.length || 6,
        ttlSec: opts.ttlSec || 300
      },
      breakpoints: [0.57],
      initialBreakpoint: 0.6,
      handle: true,
      backdropDismiss: true,
      cssClass: 'confirm-sheet-modal'
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss();

    if (role === 'backdrop') {
      try {
        await firstValueFrom(
          this.http.post('/api/v1/users/me/pin/cancel', { action: opts.action })
        );
        await this.presentToast({
          message: 'Operación cancelada',
          duration: 1500,
          color: 'medium'
        });
      } catch (e: any) {
        if (e.status === 401) {
          console.warn('Cancel ignorado: token inválido');
        } else {
          await this.presentToast({
            message: e.error?.error || 'Error al cancelar',
            duration: 1500,
            color: 'danger'
          });
        }
      }
      return null;
    }

    return data?.code ?? null;
  }



// ================================ Modal Genérico ================================
async presentGenericModal(opts: {
  title: string;
  fields: Array<{ name: string; label: string; type: string; required?: boolean; default?: any; options?: any[] }>;
  confirmText?: string;
  cancelText?: string;
  color?: string;
  cssClass?: string;
  breakpoints?: number[];
  initialBreakpoint?: number;
}): Promise<any | null> {
  const modal = await this.modalCtrl.create({
    component: GenericModalComponent,
    componentProps: {
      title: opts.title,
      fields: opts.fields,
      confirmText: opts.confirmText || 'Guardar',
      cancelText: opts.cancelText || 'Cancelar',
      color: opts.color || 'primary'
    },
    breakpoints: opts.breakpoints || [0.55],
    initialBreakpoint: opts.initialBreakpoint || 1,
    handle: true,
    backdropDismiss: true,
    cssClass: 'confirm-sheet-modal modal-generic'

  });

  await modal.present();
  const { data, role } = await modal.onDidDismiss();
  if (role === 'backdrop') return null;
  return data ?? null;
}

}
