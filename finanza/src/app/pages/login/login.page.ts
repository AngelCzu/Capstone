
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { last } from 'rxjs';
import { User } from 'src/app/models/user.model';
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






// Iniciar sesión con Google
async onClick() {
  try {

    // Mostrar el loading
    const loading = await this.utilsSvc.loading();
    await loading.present();

    // 1) Iniciar sesión con Google
    const res = await this.firebaseSvc.signInGoogle();

    loading.dismiss();

    // Obtener el UID del usuario
    const uid = res.user.uid;

    

    const path = `users/${uid}`;

    // 2) Intentar obtener el doc del usuario
    let user = await this.firebaseSvc.getDocument(path);

    // 3) Si no existe, crearlo con los datos de Google (no uses this.form aquí)
    if (!user) {

      // Si quieres separar nombre y apellido:
      let firstName = "";
      let lastName = "";

      if (res.user.displayName) {
        const parts = res.user.displayName.split(" ");
        firstName = parts[0];
        lastName = parts.slice(1).join(" "); // por si hay más de un apellido
      }

      // Crear el usuario
      user = {
        uid,
        email: res.user.email || '',
        name: firstName || '',
        lastName: lastName || '',
        photoURL: res.user.photoURL || '',
        premium: false,
        // agrega aquí otros campos por defecto que uses en tu app
        createdAt: new Date().toISOString(),
      };

      // Guardar en Firestore
      await this.firebaseSvc.setDocument(path, user);

      
    }

    // 4) Navegar
    this.utilsSvc.routerLink('/main/home');

    // 5) Mensaje de éxito
    this.utilsSvc.presentToast({
      message: `Inicio de sesión exitoso ${user['name'] || ''}`,
      duration: 1500,
      color: 'success',
      position: 'bottom',
      icon: 'person-circle-outline'
    });


  } catch (error: any) {
    console.error(error);
    this.utilsSvc.presentToast({
      message: error.message || 'Error al iniciar sesión',
      duration: 2500,
      color: 'primary',
      position: 'middle',
      icon: 'alert-circle-outline'
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