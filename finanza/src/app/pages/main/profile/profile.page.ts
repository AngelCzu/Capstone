import { Component, OnInit, inject } from '@angular/core';
import { FormGroup, FormControl, Validators, FormsModule } from '@angular/forms';
import { Utils } from 'src/app/services/utils';
import { UserApi } from 'src/app/services/user.api';
import { SharedModule } from 'src/app/shared/shared-module';
import { Firebase } from 'src/app/services/firebase';

import { getAuth, updateEmail, EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [SharedModule, FormsModule] // <-- Agrega esto
})
export class ProfilePage implements OnInit {
  
  private userApi = inject(UserApi);
  utilsSvc = inject(Utils);
  firebaseSvc = inject(Firebase);
  private http: HttpClient;

  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    name: new FormControl('', [Validators.required, Validators.minLength(4)]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(3)]),
    premium: new FormControl(false),
    photoURL: new FormControl(''),
  });

  avatarUrl: string = '';

  ngOnInit() {
    this.loadProfile();
  }

  async loadProfile() {
    const loading = await this.utilsSvc.loading();
    await loading.present();
    

    this.userApi.getMe().subscribe({
      next: (user) => {
        this.form.patchValue(user);
        this.avatarUrl = user.photoURL || '';
        loading.dismiss();
        
      },
      error: async (err) => {
        loading.dismiss();
        this.utilsSvc.presentToast({
          message: `Error al cargar perfil: ${err.message}`,
          duration: 1500,
          color: 'danger',
          position: 'bottom',
          icon: 'warning-outline'
        });
      },
    });
  }

  async saveProfile(): Promise<void> {
  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    if (!this.form.valid) throw new Error('Formulario inválido.');

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('No hay usuario autenticado.');

    const nuevoEmail = this.form.controls['email'].value;

    // 1) Si cambió el email, actualizar en Firebase Auth (podría pedir re-login)
    if (nuevoEmail && nuevoEmail !== user.email) {
      try {
        await updateEmail(user, nuevoEmail);
      } catch (err: any) {
        // Si necesita re-autenticación, pedimos la contraseña actual
        if (err?.code === 'auth/requires-recent-login') {
          // Solicita contraseña al usuario mediante tu utilsSvc o un prompt de Ionic
          const password = await this.utilsSvc.presentPasswordPrompt({
            header: 'Confirmar identidad',
            message: 'Ingresa tu contraseña para confirmar el cambio de correo'
          });
          if (!password) throw new Error('Operación cancelada');

          // Reautenticar
          const credential = EmailAuthProvider.credential(user.email!, password);
          await reauthenticateWithCredential(user, credential);

          // Intentamos nuevamente el cambio de email
          await updateEmail(user, nuevoEmail);
        } else {
          throw err;
        }
      }
    }

    // 2) Actualizar en tu backend (Firestore vía Flask)
    const payload = {
      name: this.form.controls['name'].value,
      lastName: this.form.controls['lastName'].value,
      email: nuevoEmail,
      photoURL: this.form.controls['photoURL']?.value || ''
    };

    const res = await firstValueFrom(this.http.patch('/api/v1/users/me', payload));
    console.log('Perfil actualizado backend:', res);

    await this.utilsSvc.presentToast({
      message: 'Perfil actualizado correctamente.',
      duration: 2000,
      color: 'success',
      position: 'middle',
      icon: 'checkmark-circle-outline'
    });

  } catch (error: any) {
    console.error('Error actualizando perfil:', error);
    await this.utilsSvc.presentToast({
      message: error?.message || 'Error al actualizar perfil',
      duration: 3000,
      color: 'danger',
      position: 'middle',
      icon: 'alert-circle-outline'
    });
  } finally {
    await loading.dismiss();
  }
}

  getInitials() {
    const { name, lastName } = this.form.value;
    return (name?.[0] || '') + (lastName?.[0] || '');
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.utilsSvc.presentToast({
        message: 'El archivo debe ser una imagen',
        duration: 1500,
        color: 'danger',
        position: 'bottom',
        icon: 'warning-outline'
      });
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);

    this.utilsSvc.loading().then(async loading => {
      await loading.present();

      this.userApi.uploadProfilePhoto(formData).subscribe({
        next: (res) => {
          loading.dismiss();
          this.avatarUrl = res.photoURL;
          this.form.patchValue({ photoURL: res.photoURL });

          this.utilsSvc.presentToast({
            message: 'Foto de perfil actualizada',
            duration: 1500,
            color: 'success',
            position: 'bottom',
            icon: 'checkmark-circle-outline'
          });
        },
        error: (err) => {
          loading.dismiss();
          this.utilsSvc.presentToast({
            message: `Error al subir foto: ${err.message}`,
            duration: 1500,
            color: 'danger',
            position: 'bottom',
            icon: 'warning-outline'
          });
        }
      });
    });
  }



  async signOutConfirm(): Promise<void> {
  const ok = await this.utilsSvc.presentCustomConfirm({
    title: 'Cerrar sesión',
    message: '¿Estás seguro que quieres cerrar sesión? \n\n Deberás iniciar sesión nuevamente.',
    confirmText: 'Cerrar sesión',
    cancelText: 'Cancelar'
  });

  if (!ok) return;

  try {
    // 1) Llamada al backend para revocar refresh tokens (endpoint protegido)
    await firstValueFrom(this.http.post('/api/v1/users/me/revoke', {}));

    // 2) Hacer signOut local (SDK Firebase)
    const auth = getAuth();
    await signOut(auth);

    // 3) Navegar a login
    this.utilsSvc.routerLink('/login');

    await this.utilsSvc.presentToast({
      message: 'Sesión cerrada. Debes iniciar sesión para volver a usar la app.',
      duration: 2000,
      color: 'primary'
    });
  } catch (err: any) {
    console.error('Error cerrando sesión:', err);
    await this.utilsSvc.presentToast({
      message: 'No se pudo cerrar sesión correctamente.',
      duration: 2500,
      color: 'danger'
    });
  }
}

  signOut() {
    this.firebaseSvc.signOut();
  }
}