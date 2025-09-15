import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared-module';

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { UserApi } from 'src/app/services/user.api';
import { UserProfile } from '../../../models/user.model';
import { Utils } from 'src/app/services/utils';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [SharedModule, FormsModule] // <-- Agrega esto
})
export class ProfilePage implements OnInit {
  utilsSvc = inject(Utils);

  


  user: UserProfile = {
    name: '', lastName: '', email: '', premium: false, photoURL: '',
    
  };

  avatarUrl: string = '';
 
  notifications: boolean = true;
  biometrics: boolean = false;

  constructor(
    
    private api: UserApi) { }

  ngOnInit() {
     this.api.getMe().subscribe(user => {
      this.user = user;
      this.avatarUrl = user.photoURL || '';
    });
  }

  // Método para obtener las iniciales del usuario
  getInitials(): string {
      const first = this.user.name?.charAt(0) ?? '';
      const last = this.user.lastName?.charAt(0) ?? '';
      return (first + last).toUpperCase();
    }


  // Manejar el cambio de avatar
  async onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;


    // Subir a Firebase Storage
    const storage = getStorage();
    const fileRef = ref(storage, `avatars/${this.user.email}_${Date.now()}.jpg`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    this.avatarUrl = url;
    this.user.photoURL = url;

    // Guardar en Firestore vía Flask
    this.api.updateProfile({ photoURL: url }).subscribe();
  }


   // Guardar cambios en backend
  async saveProfile() {
    if (!this.user) return;

    // Mostrar el loading
    const loading = await this.utilsSvc.loading();
    await loading.present();

    // Actualizar perfil
    this.api.updateProfile({
      name: this.user.name,
      lastName: this.user.lastName,
      photoURL: this.user.photoURL,
    }).subscribe({
      next: (res) => {
        

        // Refrescar datos del usuario
        this.api.getMe().subscribe(user => {
        this.user = user;
        this.avatarUrl = user.photoURL || '';
      }); 
      
      // refrescamos con lo que devolvió backend
        loading.dismiss()
      },
      error: (err) => {
        console.error('Error actualizando perfil:', err);
        loading.dismiss()
      },
    });
  }
}
