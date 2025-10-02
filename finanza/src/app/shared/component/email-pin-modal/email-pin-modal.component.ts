import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Utils } from 'src/app/services/utils';
import { Firebase } from 'src/app/services/firebase';
import { getAuth } from 'firebase/auth';

@Component({
  standalone: false,
  selector: 'app-email-pin-modal',
  templateUrl: './email-pin-modal.component.html',
  styleUrls: ['./email-pin-modal.component.scss'],
})
export class EmailPinModalComponent {
  @Input() email = '';
  @Input() title = '';
  @Input() ttlSec = 300;
  @Input() action!: string;
  @Output() confirmed = new EventEmitter<string>(); // pin
  @Output() cancelled = new EventEmitter<void>();


  remainingSec: number;   // segundos restantes
  intervalId: any;

  boxes = ['', '', '', '', '', ''];
  error = false;
  http = inject(HttpClient);
  utilsSvc = inject(Utils);
  firebase = inject(Firebase);

  constructor(private modalCtrl: ModalController) { }

  get remainingTime(): string {
  const min = Math.floor(this.remainingSec / 60);
  const sec = this.remainingSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

  ngOnInit() {
    this.remainingSec = this.ttlSec;

    // Inicia un temporizador que baja cada segundo
    this.intervalId = setInterval(() => {
      if (this.remainingSec > 0) {
        this.remainingSec--;
      } else {
        clearInterval(this.intervalId);
      }
    }, 1000);
  }

  // Evitar que quede corriendo si cierran modal
  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }


  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const digits = pasted.replace(/\D/g, '').split('').slice(0, 6);

    digits.forEach((d, i) => {
      const input = document.getElementById(`pin-${i}`) as HTMLInputElement;
      if (input) {
        input.value = d;
        this.boxes[i] = d;
      }
    });

    if (digits.length > 0) {
      const last = document.getElementById(`pin-${digits.length - 1}`);
      (last as HTMLInputElement)?.focus();
    }
  }

  onKeyDown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      if (this.boxes[index]) {
        this.boxes[index] = '';
      } else if (index > 0) {
        const prev = document.getElementById(`pin-${index - 1}`) as HTMLInputElement;
        prev?.focus();
        prev.value = '';
        this.boxes[index - 1] = '';
      }
    }
  }

  onKey(i: number, ev: any) {
    const v = (ev.target.value || '').replace(/\D/g, '');
    this.boxes[i] = v.slice(-1);
    this.error = false;
    if (this.boxes[i] && i < 5) {
      const next = document.getElementById('pin-' + (i + 1)) as HTMLInputElement;
      next?.focus();
    }
  }

  get pin(): string {
    return this.boxes.join('');
  }

  async submit() {
    if (this.pin.length !== 6) {
      this.error = true;
      return;
    }

    try {
      const res: any = await firstValueFrom(
        this.http.post('/api/v1/users/me/pin/confirm', {
          pin: this.pin,
          action: this.action,
        })
      );

      await this.modalCtrl.dismiss({ code: this.pin }, 'confirm');

      await this.utilsSvc.presentToast({
        message: 'Acción realizada correctamente',
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });

      // 👇 Solo en acciones críticas cerrar sesión y redirigir
      if (this.action === 'email-change') {
        await this.firebase.signOutAndWait(); //  primero logout
        await this.utilsSvc.presentToast({
          message: 'Cambio correo existoso. Inicie sesión de nuevo',
          duration: 2000,
          position: 'bottom',
          color: 'success'
        });
        this.utilsSvc.routerLink('/login');
      }

      if (this.action === 'delete-account') {
        await this.firebase.signOutAndWait(); //  primero logout
        await this.utilsSvc.presentToast({
          message: 'Cuenta eliminada correctamente',
          duration: 2000,
          position: 'bottom',
          color: 'success'
        });
        this.utilsSvc.routerLink('/login');
      }

    } catch (e: any) {
      this.error = true;

      const errorMsg = e.error?.error || 'PIN inválido';

      await this.utilsSvc.presentToast({
        message: errorMsg,
        duration: 1500,
        color: 'danger',
        position: 'top',
      });

      // Errores críticos → cancelar operación
      if (
        errorMsg === 'Demasiados intentos' ||
        errorMsg === 'PIN expirado' ||
        errorMsg === 'Operación inválida' ||
        errorMsg === 'No hay operación pendiente'
      ) {
        await this.utilsSvc.presentToast({
          message: 'Operación cancelada, ' + errorMsg,
          duration: 2000,
          position: 'top',
          color: 'danger',
        });
        await this.modalCtrl.dismiss(null, 'cancel');
      }

      // Aseguramos que no suba al interceptor
      const auth = getAuth();
      await auth.currentUser?.reload();
      return;
    }
  }

  async cancel() {
    try {
      await firstValueFrom(
        this.http.post('/api/v1/users/me/pin/cancel', { action: this.action })
      );

      await this.utilsSvc.presentToast({
        message: 'Operación cancelada',
        duration: 2000,
        position: 'bottom',
        color: 'medium',
      });
    } catch (e: any) {
      // 👇 Ignorar si el error es 401 (token revocado)
      if (e.status === 401) {
        console.warn('Cancel ignorado: token inválido');
      } else {
        await this.utilsSvc.presentToast({
          message: e.error?.error || 'Error al cancelar',
          duration: 1500,
          position: 'bottom',
          color: 'danger',
        });
      }
    }

    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async dismissOnBackdrop() {
    await this.cancel();
  }
}
