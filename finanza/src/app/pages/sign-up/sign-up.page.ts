
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { Firebase } from 'src/app/services/firebase';
import { Utils } from 'src/app/services/utils';

import { SharedModule } from 'src/app/shared/shared-module';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { getAuth } from 'firebase/auth';

import { firstValueFrom } from 'rxjs';


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
  http = inject(HttpClient)
  firebaseSvc = inject(Firebase);
  utilsSvc = inject(Utils);

  ngOnInit() {
  }

  async submit() {
    if (this.form.valid) {

      // Mostrar el loading
      const loading = await this.utilsSvc.loading();
      await loading.present();

      // Registro de usuario
      this.firebaseSvc.signUp(this.form.value as User).then(async res => {

        const auth = getAuth();
        const idToken = await res.user.getIdToken();



        //guardar uid en formulario
        let uid = res.user.uid;
        this.form.controls.uid.setValue(uid);

        // por defecto el usuario no es premium
        let premium = false;
        this.form.controls['premium'].setValue(premium);

        // por defecto la foto es vacía
        let photoURL = '';
        this.form.controls['photoURL'].setValue(photoURL);

        
        
        // actualizar usuario en firebase
        this.setUserInfo(idToken);


      }).catch(error => {

        this.utilsSvc.presentToast({
          message: error.message,
          duration: 2500,
          color: 'primary',
          position: 'bottom',
          icon: 'alert-circle-outline'
        });

      }).finally(() => {
        loading.dismiss();
      });
    }
  }

async setUserInfo(idToken: string): Promise<void> {
  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    if (!this.form.valid) throw new Error('Formulario inválido.');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    });

    const res = await firstValueFrom(
      this.http.post('/api/v1/users/me', this.form.value, { headers })
    );

    await this.utilsSvc.presentToast({
      message: 'Perfil creado correctamente.',
      duration: 2000,
      color: 'success',
      position: 'bottom',
      icon: 'checkmark-circle-outline'
    });

    this.form.reset();
    this.utilsSvc.routerLink('/main/home');

  } catch (err: any) {
    console.error('Error guardando usuario', err);

    const message =
      err?.status === 401
        ? 'No autorizado: el token no es válido o expiró.'
        : (err?.error?.message ?? 'No se pudo guardar el usuario.');

    await this.utilsSvc.presentToast({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom',
      icon: 'alert-circle-outline'
    });

  } finally {
    await loading.dismiss();
  }
}

}
