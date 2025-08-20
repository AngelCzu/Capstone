
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { Firebase } from 'src/app/services/firebase';
import { Utils } from 'src/app/services/utils';

import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [ FormsModule, SharedModule] // <-- Agrega esto
})
export class LoginPage implements OnInit {

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
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


      // Iniciar sesión
      this.firebaseSvc.signIn(this.form.value as User).then(res => {



        // Obtener información de usuario en la base de datos
        this.getUserInfo(res.user.uid);

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

        // Limpiar el formulario
        this.form.reset();
      });
    } 
  }

 async getUserInfo(uid: string) {
    if (this.form.valid) {

      // Mostrar el loading
      const loading = await this.utilsSvc.loading();
      await loading.present();

      // Obtener información de usuario en la base de datos
      let path = `users/${uid}`;

      this.firebaseSvc.getDocument(path).then((user: User) => {

        // guardar en storage local
        this.utilsSvc.saveLocalStorage('user', user);

        // Redirigir al usuario a la página principal
        this.utilsSvc.routerLink('/main/home');

        // Mostrar mensaje de éxito
        this.utilsSvc.presentToast({
          message: `Inicio de sesión exitoso ${user.name}`,
          duration: 1500,
          color: 'primary',
          position: 'middle',
          icon: 'person-circle-outline'
        });
        

      }).catch(error => {

        // Mostrar el error


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
