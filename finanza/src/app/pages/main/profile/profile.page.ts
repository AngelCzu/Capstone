import { Component, OnInit, inject } from '@angular/core';
import { FormGroup, FormControl, Validators, FormsModule } from '@angular/forms';
import { Utils } from 'src/app/services/utils';
import { UserApi } from 'src/app/services/user.api';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [SharedModule, FormsModule] // <-- Agrega esto
})
export class ProfilePage implements OnInit {
  private userApi = inject(UserApi);
  utilsSvc = inject(Utils);

  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    name: new FormControl('', [Validators.required, Validators.minLength(4)]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(3)]),
    premium: new FormControl(false),
    photoURL: new FormControl(''),
  });

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

  async saveProfile() {
    if (this.form.invalid) return;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    this.userApi.updateProfile(this.form.value).subscribe({
      next: async () => {
        loading.dismiss();
        this.utilsSvc.presentToast({
          message: 'Perfil actualizado',
          duration: 1500,
          color: 'success',
          position: 'bottom',
          icon: 'checkmark-circle-outline'
        });
      },
      error: async (err) => {
        loading.dismiss();
        this.utilsSvc.presentToast({
          message: `Error al actualizar perfil: ${err.message}`,
          duration: 1500,
          color: 'danger',
          position: 'bottom',
          icon: 'warning-outline'
        });
      },
    });
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

}