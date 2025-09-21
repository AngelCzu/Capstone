import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Utils } from 'src/app/services/utils';
import { getAuth } from 'firebase/auth';
import { Firebase } from 'src/app/services/firebase';
@Component({
  standalone: false,
  selector: 'app-email-pin-modal',
  templateUrl: './email-pin-modal.component.html',
  styleUrls: ['./email-pin-modal.component.scss'],

})
export class EmailPinModalComponent {
  @Input() email = '';
  @Input() ttlSec = 300;
  @Output() confirmed = new EventEmitter<string>(); // pin
  @Output() cancelled = new EventEmitter<void>();

  boxes = ['', '', '', '', '', ''];
  error = false;
  http = inject(HttpClient);
  utilsSvc = inject(Utils);
  firebase = inject(Firebase);

  constructor(private modalCtrl: ModalController) { }



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

    // mover focus al último campo rellenado
    if (digits.length > 0) {
      const last = document.getElementById(`pin-${digits.length - 1}`);
      (last as HTMLInputElement)?.focus();
    }
  }


  onKeyDown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace') {
      if (this.boxes[index]) {
        // si hay valor, bórralo
        this.boxes[index] = '';
      } else if (index > 0) {
        // si está vacío y no es el primero → ir al anterior
        const prev = document.getElementById(`pin-${index - 1}`) as HTMLInputElement;
        prev?.focus();
        prev.value = ''; // limpia también el anterior
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

  get pin(): string { return this.boxes.join(''); }

async submit() {
  if (this.pin.length !== 6) {
    this.error = true;
    return;
  }

  try {
    // Validar directamente con backend
    const res: any = await firstValueFrom(
      this.http.post('/api/v1/users/me/email-change/confirm', { pin: this.pin })
    );

    //  PIN correcto
    await this.utilsSvc.presentToast({
      message: 'Correo actualizado. Vuelve a iniciar sesión.',
      duration: 1500,
      position: 'bottom',
      color: 'success'
    });

    await this.firebase.signOutAndWait();
    this.utilsSvc.routerLink('/login');

    await this.modalCtrl.dismiss({ code: this.pin }, 'confirm');

  } catch (e: any) {
    this.error = true;

    //  Recarga el usuario de Firebase para evitar desincronización
    const auth = getAuth();
    await auth.currentUser?.reload();

    const errorMsg = e.error?.error || 'PIN inválido';

    await this.utilsSvc.presentToast({
      message: errorMsg,
      duration: 1500,
      color: 'danger'
    });

    //  Errores que deben cancelar la operación
    if (
      errorMsg === 'Demasiados intentos' ||
      errorMsg === 'PIN expirado' ||
      errorMsg === 'Operación inválida' ||
      errorMsg === 'No hay operación pendiente'
    ){

      await this.utilsSvc.presentToast({
        message: 'Operación cancelada',
        duration: 2000,
        position: 'bottom',
        color: 'medium',
      });

      await this.modalCtrl.dismiss(null, 'cancel');
    }
    //  Recarga el usuario de Firebase para evitar desincronización
      await auth.currentUser?.reload();
    // 👇 Esto asegura que el error no se propague al interceptor
    return;
  }
}

  async cancel() {
    try {
      await firstValueFrom(this.http.post('/api/v1/users/me/email-change/cancel', {}));
      await this.utilsSvc.presentToast({
        message: 'Operación cancelada',
        duration: 2000,
        position: 'bottom',
        color: 'medium',
      });

      //  Recarga el usuario de Firebase para evitar desincronización
      const auth = getAuth();
      await auth.currentUser?.reload();

    } catch (e: any) {
      await this.utilsSvc.presentToast({
        message: e.error?.error || 'Error al cancelar',
        duration: 1500,
        position: 'bottom',
        color: 'danger',
      });
    }

    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async dismissOnBackdrop() {
    await this.cancel();
  }

}
