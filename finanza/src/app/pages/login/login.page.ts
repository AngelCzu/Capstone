
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { firstValueFrom, last } from 'rxjs';
import { User } from 'src/app/models/user.model';
import { UserApi } from 'src/app/services/apis/user.api';
import { Firebase } from 'src/app/services/firebase';
import { Utils } from 'src/app/services/utils';

import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [FormsModule, SharedModule] // <-- Agrega esto
})
export class LoginPage implements OnInit {

  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  constructor() { }


  // Inyectar servicios 
  firebaseSvc = inject(Firebase);
  utilsSvc = inject(Utils);
  userApi = inject(UserApi);

  ngOnInit() {
  }


// =============== LOGIN CON EMAIL Y PASSWORD ===============
async submit() {
  if (!this.form.valid) return;

  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    // 1️⃣ Iniciar sesión con Firebase Auth
    const res = await this.firebaseSvc.signIn(this.form.value as User);

    // 2️⃣ Obtener token del usuario
    const token = await res.user.getIdToken();

    // 3️⃣ Obtener datos del perfil desde backend
    const userData = await this.userApi.obtenerDatosCompletosUsuario();

    // 5️⃣ Redirigir a la página principal
    this.utilsSvc.routerLink('/main/home');

    this.utilsSvc.presentToast({
      message: `Inicio de sesión exitoso ${userData.name || ''}`,
      duration: 1500,
      color: 'success',
      position: 'bottom',
      icon: 'person-circle-outline'
    });

  } catch (error: any) {
    console.error('❌ Error al iniciar sesión:', error);
    this.utilsSvc.presentToast({
      message: error.message || 'Error al iniciar sesión',
      duration: 2500,
      color: 'primary',
      position: 'bottom',
      icon: 'alert-circle-outline'
    });
  } finally {
    loading.dismiss();
    this.form.reset();
  }
}

// ================== LOGIN CON GOOGLE ==================
async onClick() {
  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    // 1️⃣ Iniciar sesión con Google
    const res = await this.firebaseSvc.signInGoogle();
    const token = await res.user.getIdToken();

    // 2️⃣ Obtener el perfil actual desde el backend
    let currentProfile: any;
    try {
      currentProfile = await firstValueFrom(this.userApi.getMe());
    } catch {
      currentProfile = {};
    }

    // 3️⃣ Extraer datos de Google
    const nameParts = res.user.displayName ? res.user.displayName.split(' ') : [];
    const googleData = {
      name: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: res.user.email || '',
      photoURL: res.user.photoURL || ''
    };

    // 4️⃣ Fusionar datos → solo actualizar si faltan en el perfil actual
    const updateData: any = {};
    if (!currentProfile.name && googleData.name) updateData.name = googleData.name;
    if (!currentProfile.lastName && googleData.lastName) updateData.lastName = googleData.lastName;
    if (!currentProfile.photoURL && googleData.photoURL) updateData.photoURL = googleData.photoURL;

    // Si no existe el usuario, lo creamos
    if (!currentProfile.uid) {
      await firstValueFrom(this.userApi.createUser(googleData));
    } else if (Object.keys(updateData).length > 0) {
      // Si existe y hay algo que actualizar, hacemos PATCH
      await firstValueFrom(this.userApi.updateProfile(updateData));
    }

    // 5️⃣ Obtener perfil completo y categorías
    const userData = await this.userApi.obtenerDatosCompletosUsuario();


    // 7️⃣ Redirigir al home
    this.utilsSvc.routerLink('/main/home');

    // 8️⃣ Mostrar toast de éxito
    this.utilsSvc.presentToast({
      message: `Inicio de sesión exitoso ${userData.name || ''}`,
      duration: 1500,
      color: 'success',
      position: 'bottom',
      icon: 'person-circle-outline'
    });

  } catch (error: any) {
    console.error('❌ Error en Google Sign-In:', error);
    this.utilsSvc.presentToast({
      message: error.message || 'Error al iniciar sesión con Google',
      duration: 2500,
      color: 'primary',
      position: 'bottom',
      icon: 'alert-circle-outline'
    });
  } finally {
    loading.dismiss();
  }
}


}