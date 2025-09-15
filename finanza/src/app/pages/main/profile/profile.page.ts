import { Component, inject, OnInit } from '@angular/core';
import { SharedModule } from 'src/app/shared/shared-module';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
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

  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    name: new FormControl('', [Validators.required, Validators.minLength(4)]),
    lastName: new FormControl('', [Validators.required, Validators.minLength(3)]),
    photoURL: new FormControl('')

  });

  constructor(
    
    private api: UserApi) { }

  ngOnInit() {
   this.loadProfile();
  }


  loadProfile() {
    this.utilsSvc.loading().then(loading => {
      loading.present();

      this.api.getMe().subscribe({
        next: (user) => {
          this.user = user;
          this.avatarUrl = user.photoURL || '';
          loading.dismiss(); // cerrar loading SOLO cuando llega la data
        },
        error: (err) => {
          console.error('Error cargando perfil', err);
          loading.dismiss(); // cerrar loading también en caso de error

          // Mostrar mensaje de error
        this.utilsSvc.presentToast({
          message: `Error al cargar perfil: ${err.message}`,
          duration: 1500,
          color: 'danger',
          position: 'middle',
          icon: 'warning-outline'
        });
        }
      });
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
        this.loadProfile();
      
      // Cerrar loading
        loading.dismiss()

        // Mostrar mensaje de éxito
        this.utilsSvc.presentToast({
          message: `Actualización exitosa`,
          duration: 1500,
          color: 'success',
          position: 'bottom',
          icon: 'checkmark-circle-outline'
        });
      },
      error: (err) => {
        // Mostrar mensaje de éxito
        this.utilsSvc.presentToast({
          message: `${err.message}`,
          duration: 1500,
          color: 'danger',
          position: 'bottom',
          icon: 'warning-outline'
        });
        loading.dismiss()
      },
    });
  }
}
