import { Component, OnInit, inject } from '@angular/core';
import { FormGroup, FormControl, Validators, FormsModule } from '@angular/forms';
import { Utils } from 'src/app/services/utils';
import { UserApi } from 'src/app/services/user.api';
import { SharedModule } from 'src/app/shared/shared-module';
import { Firebase } from 'src/app/services/firebase';

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
  http = inject(HttpClient);
  

  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    name: new FormControl('', [Validators.required, Validators.minLength(4),Validators.pattern('^[a-zA-ZÀ-ÿ\\s]+$')]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(3),Validators.pattern('^[a-zA-ZÀ-ÿ\\s]+$')]),
    premium: new FormControl(false),
    photoURL: new FormControl(''),
  });

  initialEmail: string;

  
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
        this.initialEmail = user.email;

        
        
        
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

async onSubmit() {
  const loading = await this.utilsSvc.loading(); 
  await loading.present();
  try {
    const email = this.form.controls.email.value!;
    const name = this.form.controls.name.value!;
    const lastName = this.form.controls.lastName.value!;
    const photoURL = this.form.controls.photoURL.value || '';

    // 1) Si cambió el correo → pedir PIN
    if (email && email !== this.initialEmail) {
      await firstValueFrom(this.http.post('/api/v1/users/me/email-change/request', { newEmail: email }));
      loading.dismiss();
      // 👇 Usamos utilsSvc en vez de crear modal aquí
      const pin = await this.utilsSvc.presentPinSheet({
        email,
        title: 'Cambio de correo',
        message: 'Introduce el código de 6 dígitos que enviamos a tu nuevo correo /n',
        ttlSec: 300, // 5 minutos para que caduque el PIN
        
      });
      
       

      
    }else {
      // 2) Si NO cambió el email → actualizar perfil normal
      await firstValueFrom(this.http.patch('/api/v1/users/me', { name, lastName, photoURL }));
      await this.utilsSvc.presentToast({ 
        message: 'Perfil actualizado', 
        color: 'success',
        position: 'bottom',
        duration: 1500,
      });
    }

    

  } catch (err: any) {
    await this.utilsSvc.presentToast({
      message: err?.message || 'Error', 
      color: 'danger', 
      duration: 1500,
      position:"bottom"});
  } finally {
    loading.dismiss();
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
  const confirmed = await this.utilsSvc.presentConfirmSheet({
  title: 'Cerrar Sesión',
  message: '¿Seguro que deseas cerrar sesión?',
  confirmText: 'Cerrar Sesión',
  cancelText: 'Cancelar',
  color: 'danger',
  icon: 'alert-circle-outline'
});

  if (!confirmed) return;

   const loading = await this.utilsSvc.loading();
   loading.present();
  try {
    // Revocar en el backend
    await firstValueFrom(this.http.post('/api/v1/users/me/revoke', {}));

    // Cerrar sesión en Firebase
    await this.firebaseSvc.signOutAndWait();

    // Limpiar storage local
    localStorage.clear();
    sessionStorage.clear();

    // Redirigir directamente al login
    this.utilsSvc.routerLink('/login');

  } catch (error) {
    this.utilsSvc.presentToast({
      message: 'Error cerrando sesión',
      color: 'danger',
      position: "bottom",
      duration: 1500
    });
    loading.dismiss();  
  } finally {
   // Cierra el loading antes del redirect
    await loading.dismiss();

    
  }
}

async deleteAccountConfirm(): Promise<void> {
  const confirmed = await this.utilsSvc.presentConfirmSheet({
  title: 'Eliminar Cuenta',
  message: '¿Seguro que deseas eliminar tú cuenta? \n Sí la eliminas perderás permanentemente toda información',
  confirmText: 'Eliminar Cuenta',
  cancelText: 'Cancelar',
  color: 'danger',
  icon: 'alert-circle-outline'
});

  if (!confirmed) return;

   const loading = await this.utilsSvc.loading();
   loading.present();
  try {
    
    await firstValueFrom(this.http.post('/api/v1/users/me/email-change/request', { newEmail: this.initialEmail }));
      loading.dismiss();
      // 👇 Usamos utilsSvc en vez de crear modal aquí
      const pin = await this.utilsSvc.presentPinSheet({
        email: this.initialEmail,
        title: 'Eliminar cuenta',
        message: 'Introduce el código de 6 dígitos que enviamos a tu correo para confirma la eliminación de la cuenta /n',
        ttlSec: 300, // 5 minutos para que caduque el PIN
        
      });

      
    // Limpiar storage local
    localStorage.clear();
    sessionStorage.clear();

    


  } catch (error) {
    this.utilsSvc.presentToast({
      message: 'Error al borrar la cuenta',
      color: 'danger',
      position: "bottom",
      duration: 1500
    });
    loading.dismiss();  
  } finally {
   // Cierra el loading antes del redirect
    await loading.dismiss();

    
  }
}

}