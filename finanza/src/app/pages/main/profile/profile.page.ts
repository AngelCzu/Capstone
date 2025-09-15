import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared-module';
import { Firebase } from 'src/app/services/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { UserApi } from 'src/app/services/user.api';
import { UserProfile } from '../../../models/user.model';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [SharedModule, FormsModule] // <-- Agrega esto
})
export class ProfilePage implements OnInit {

  user: UserProfile = {
    name: '', lastName: '', email: '', premium: false, photo: '',
    
  };

  avatarUrl: string = '';
 
  notifications: boolean = true;
  biometrics: boolean = false;

  constructor(
    private firebase: Firebase,
    private api: UserApi) { }

  ngOnInit() {
     this.api.getMe().subscribe(user => {
      this.user = user;
      this.avatarUrl = user.photo || '';
    });
  }


  getInitials(): string {
      const first = this.user.name?.charAt(0) ?? '';
      const last = this.user.lastName?.charAt(0) ?? '';
      return (first + last).toUpperCase();
    }


  async onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // 🔹 Subir a Firebase Storage
    const storage = getStorage();
    const fileRef = ref(storage, `avatars/${this.user.email}_${Date.now()}.jpg`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    this.avatarUrl = url;
    this.user.photo = url;

    // 🔹 Guardar en Firestore vía Flask
    this.api.patchMe({ photo: url }).subscribe();
  }


  saveProfile() {
    const patch = {
      nombre: this.user.name,
      apellido: this.user.lastName,
      email: this.user.email,
    };
    this.api.patchMe(patch).subscribe();
  }
}
