
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { Firebase } from 'src/app/services/firebase';
import { Utils } from 'src/app/services/utils';

import { SharedModule } from 'src/app/shared/shared-module';


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

  });

  constructor() { }


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

        // actualizar usuario en firebase
        await this.firebaseSvc.updateUser(this.form.value.name).then(() => {

          //guardar uid en formulario
          let uid = res.user.uid;
          this.form.controls.uid.setValue(uid);

          // Insertar información de usuario en la base de datos
          this.setUserInfo(uid);

        });
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
  
  async setUserInfo(uid: string) {
    if (this.form.valid) {

      // Mostrar el loading
      const loading = await this.utilsSvc.loading();
      await loading.present();

      // Insertar información de usuario en la base de datos
      let path = `users/${uid}`;
      delete this.form.value.password; // Eliminar la contraseña del objeto antes de guardarlo

      this.firebaseSvc.setDocument(path, this.form.value).then(async res => {

        // guardar en storage local
        this.utilsSvc.saveLocalStorage('user', this.form.value);

        // Redirigir al usuario a la página de inicio
        this.utilsSvc.routerLink('/main/home');
        this.form.reset();
        

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
}
