import { Component, OnInit, inject } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { FormGroup, FormControl, Validators, FormsModule } from '@angular/forms';
import { Utils } from 'src/app/services/utils';
import { UserApi } from 'src/app/services/apis/user.api';
import { SharedModule } from 'src/app/shared/shared-module';
import { Firebase } from 'src/app/services/firebase';

import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User } from 'src/app/models/user.model';
import { environment } from 'src/environments/environment';




@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [SharedModule, FormsModule] // <-- Agrega esto
})
export class ProfilePage implements OnInit {
  private readonly usersMeUrl = `${environment.apiUrl}/users/me`;
  
  private userApi = inject(UserApi);
  utilsSvc = inject(Utils);
  firebaseSvc = inject(Firebase);
  http = inject(HttpClient);

  //Prueba notificaciones
  user: User | null = null;
  

  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    name: new FormControl('', [Validators.required, Validators.minLength(4),Validators.pattern('^[a-zA-ZÀ-ÿ\\s]+$')]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(3),Validators.pattern('^[a-zA-ZÀ-ÿ\\s]+$')]),
    premium: new FormControl(false),
    photoURL: new FormControl(''),

    //PRUEBA DE NOTIFICACIONES
    settings: new FormGroup({
      recordatoriosGastos: new FormControl(true),
      recordatoriosPagos: new FormControl(true)
    })
  });
  
  initialEmail: string;

  
  avatarUrl: string = '';

  ngOnInit() {
    this.loadProfile();
    
  }

  async onRefresh(event: RefresherCustomEvent) {
    try {
      await this.loadProfile();
    } finally {
      try { event.target.complete(); } catch {}
    }
  }

async loadProfile() {
  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    // 1️⃣ Intentar cargar desde localStorage
    const storedData = localStorage.getItem('userData');
    if (storedData) {
      const user = JSON.parse(storedData);
      console.log('📦 Datos cargados desde localStorage:', user);

      this.form.patchValue({
        ...user,
        settings: {
          recordatoriosGastos: user.settings?.recordatoriosGastos ?? true,
          recordatoriosPagos: user.settings?.recordatoriosPagos ?? true,
        },
      });

      this.avatarUrl = user.photoURL || '';
      this.initialEmail = user.email;
      loading.dismiss();
      return; // ⛔ no hace falta pedir al backend si ya tenemos datos
    }

    // 2️⃣ Si no hay datos locales, cargar desde backend
    const userFromApi = await firstValueFrom(this.userApi.getMe());
    this.form.patchValue({
      ...userFromApi,
      settings: {
        recordatoriosGastos: userFromApi.settings?.recordatoriosGastos ?? true,
        recordatoriosPagos: userFromApi.settings?.recordatoriosPagos ?? true,
      },
    });

    this.avatarUrl = userFromApi.photoURL || '';
    this.initialEmail = userFromApi.email;

    // Guardar en localStorage para futuras cargas rápidas
    localStorage.setItem('userData', JSON.stringify(userFromApi));

  } catch (err: any) {
    console.error('Error al cargar perfil:', err);
    this.utilsSvc.presentToast({
      message: `Error al cargar perfil: ${err.message || 'Error desconocido'}`,
      duration: 1500,
      color: 'danger',
      position: 'bottom',
      icon: 'warning-outline',
    });
  } finally {
    loading.dismiss();
  }
}


async onSubmit() {
  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    const email = this.form.controls.email.value!;
    const name = this.form.controls.name.value!;
    const lastName = this.form.controls.lastName.value!;
    const photoURL = this.form.controls.photoURL.value || '';

    // 1️⃣ Obtener datos actuales
    const storedUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const cambios: any = {};

    if (email && email !== storedUser.email) cambios.email = email;
    if (name && name !== storedUser.name) cambios.name = name;
    if (lastName && lastName !== storedUser.lastName) cambios.lastName = lastName;
    if (photoURL && photoURL !== storedUser.photoURL) cambios.photoURL = photoURL;

    if (Object.keys(cambios).length === 0) {
      await this.utilsSvc.presentToast({
        message: 'No hay cambios para guardar',
        duration: 1500,
        color: 'medium',
        position: 'bottom',
      });
      loading.dismiss();
      return;
    }

    // 2️⃣ Si cambió el correo → flujo de PIN
    if (cambios.email) {
      await firstValueFrom(
        this.http.post(`${this.usersMeUrl}/pin/request`, {
          action: 'email-change',
          target: cambios.email,
        })
      );

      loading.dismiss();

      const pin = await this.utilsSvc.presentPinSheet({
        email: cambios.email,
        action: 'email-change',
        title: 'Cambio de correo',
        message: 'Introduce el código de 6 dígitos que enviamos a tu nuevo correo',
        ttlSec: 300,
      });

      // Actualizar email en localStorage
      storedUser.email = cambios.email;
      localStorage.setItem('userData', JSON.stringify(storedUser));

      await this.utilsSvc.presentToast({
        message: 'Correo actualizado correctamente',
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });

      return;
    }

    // 3️⃣ Actualizar perfil en Firestore
    await firstValueFrom(this.userApi.updateProfile(cambios));

    // 4️⃣ Actualizar localStorage.userData
    const mergedUser = {
      ...storedUser,
      ...cambios,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('userData', JSON.stringify(mergedUser));

    await this.utilsSvc.presentToast({
      message: 'Perfil actualizado correctamente',
      color: 'success',
      duration: 1500,
      position: 'bottom',
    });

  } catch (err: any) {
    console.error('❌ Error al actualizar perfil:', err);
    await this.utilsSvc.presentToast({
      message: err?.message || 'Error al actualizar perfil',
      color: 'danger',
      duration: 1500,
      position: 'bottom',
    });
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
    
      await firstValueFrom(this.http.post(`${this.usersMeUrl}/pin/request`, {
        action: 'delete-account'
      }));
      loading.dismiss();
      // 👇 Usamos utilsSvc en vez de crear modal aquí
      const pin = await this.utilsSvc.presentPinSheet({
        email: this.initialEmail,
        action: 'delete-account',
        title: 'Eliminar cuenta',
        message: 'Introduce el código de 6 dígitos que enviamos a tu correo para confirma la eliminación de la cuenta /n',
        ttlSec: 300, // 5 minutos para que caduque el PIN
        
      });

      // Limpiar storage local
      localStorage.removeItem('userData'); 
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

//===================================================PRUEBA NOTIFICACIONES===================================================
async probarNotificacion() {
    const loading = await this.utilsSvc.loading();
    try {
      const resp = await firstValueFrom(this.userApi.sendTestPush());
      this.utilsSvc.presentToast({
        message:`Push enviada ✅ (éxitos: ${resp.success}, fallos: ${resp.failure})`,
        duration: 1500

      });
    } catch (err) {
      console.error('Error enviando push:', err);
      this.utilsSvc.presentToast({
        message:'❌ Error al enviar notificación',
        duration: 1500

      });
    } finally {
      loading.dismiss();
    }
  }




}
