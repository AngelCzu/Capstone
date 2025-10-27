
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { Firebase } from 'src/app/services/firebase';
import { Utils } from 'src/app/services/utils';

import { SharedModule } from 'src/app/shared/shared-module';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { getAuth } from 'firebase/auth';

import { firstValueFrom } from 'rxjs';
import { UserApi } from 'src/app/services/apis/user.api';


@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
  imports: [SharedModule, FormsModule] // <-- Agrega esto

})
export class SignUpPage implements OnInit {

  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required, Validators.minLength(4),Validators.pattern('^[a-zA-ZÀ-ÿ\\s]+$')]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(3),Validators.pattern('^[a-zA-ZÀ-ÿ\\s]+$')]),
    premium: new FormControl(false),
    photoURL: new FormControl('')

  });

  constructor() { }


  // Inyectar servicios 
  userApi = inject(UserApi)
  firebaseSvc = inject(Firebase);
  utilsSvc = inject(Utils);

  ngOnInit() {
  }


// =============== REGISTRO DE USUARIO ===================

async submit() {
  if (!this.form.valid) return;

  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    // 1️⃣ Registrar usuario en Firebase Auth
    const res = await this.firebaseSvc.signUp(this.form.value as User);
    const token = await res.user.getIdToken();

    // 2️⃣ Preparar datos iniciales del perfil
    const uid = res.user.uid;
    const photoURL = res.user.photoURL || '';
    const premium = false;

    // 3️⃣ Completar el formulario con valores por defecto
    this.form.patchValue({
      uid,
      premium,
      photoURL
    });

    // 4️⃣ Crear el perfil en backend
    await firstValueFrom(this.userApi.createUser(this.form.value));

    // 5️⃣ Obtener todos los datos del usuario (perfil + categorías)
    const userData = await this.userApi.obtenerDatosCompletosUsuario();

    // 7️⃣ Redirigir y mostrar mensaje
    this.utilsSvc.routerLink('/main/home');
    this.utilsSvc.presentToast({
      message: `Registro exitoso ${userData.name || ''}`,
      duration: 2000,
      color: 'success',
      position: 'bottom',
      icon: 'checkmark-circle-outline'
    });

  } catch (error: any) {
    console.error('❌ Error en registro:', error);

    const message =
      error?.status === 401
        ? 'Token inválido o expirado.'
        : error.message || 'Error al registrar usuario.';

    this.utilsSvc.presentToast({
      message,
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


}
