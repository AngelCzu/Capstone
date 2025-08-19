
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
        console.log(res);


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
