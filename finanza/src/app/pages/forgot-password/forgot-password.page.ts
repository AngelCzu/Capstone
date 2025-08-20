
import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { Firebase } from 'src/app/services/firebase';
import { Utils } from 'src/app/services/utils';

import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  imports: [SharedModule, FormsModule] // <-- Agrega esto

})
export class ForgotPasswordPage implements OnInit {

 form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    
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
      this.firebaseSvc.sendRecoverEmail(this.form.value.email).then(res => {

        // Mostrar mensaje de éxito
        this.utilsSvc.presentToast({
          message: 'Correo de recuperación enviado',
          duration: 2500,
          color: 'success',
          position: 'bottom',
          icon: 'checkmark-circle-outline'
        });

        this.utilsSvc.routerLink('/login'); // Redirigir al usuario a la página de inicio
        this.form.reset(); // Limpiar el formulario

        

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


}
