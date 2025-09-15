
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { Firebase } from 'src/app/services/firebase';
import { Utils } from 'src/app/services/utils';

import { SharedModule } from 'src/app/shared/shared-module';

import { HttpClient } from '@angular/common/http';
import { getAuth } from 'firebase/auth';


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
    name: new FormControl('', [Validators.required, Validators.minLength(4)]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(3)]),
    premium: new FormControl(false),
    photo: new FormControl('')

  });

  constructor(private http: HttpClient) { }


  // Inyectar servicios 
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
        const idToken = await auth.currentUser.getIdToken();



        //guardar uid en formulario
        let uid = res.user.uid;
        this.form.controls.uid.setValue(uid);

        // por defecto el usuario no es premium
        let premium = false;
        this.form.controls['premium'].setValue(premium);

        // por defecto la foto es vacía
        let photo = '';
        this.form.controls['photo'].setValue(photo);


        // actualizar usuario en firebase
        this.setUserInfo(idToken);


      }).catch(error => {

        // Mostrar el error
        console.error(error);

        this.utilsSvc.presentToast({
          message: error.message,
          duration: 2500,
          color: 'primary',
          position: 'middle',
          icon: 'alert-circle-outline'
        });

      }).finally(() => {
        loading.dismiss();
      });
    }
  }

  async setUserInfo(idToken: string) {
    // Mostrar el loading
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {

      if (this.form.valid) {



        // Llamada al backend Flask (usando proxy /api)
        this.http
          .post('/api/v1/users/me', this.form.value, {
            headers: { Authorization: `Bearer ${idToken}` },
          }).subscribe({
            next: (res) => console.log("Usuario guardado en Firestore vía Flask", res),
            error: (err) => console.error("Error guardando usuario", err)
          });

        // Redirigir al usuario a la página de inicio
        this.utilsSvc.routerLink('/main/home');
        this.form.reset();

      }
    } catch (error) {
      // Mostrar el error
      console.error(error);

      this.utilsSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'primary',
        position: 'middle',
        icon: 'alert-circle-outline'
      });
    } finally {
      loading.dismiss();

    }

  }
}
