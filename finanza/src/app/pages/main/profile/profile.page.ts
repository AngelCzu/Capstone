import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared-module';
import { Firebase } from 'src/app/services/firebase';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [SharedModule, FormsModule] // <-- Agrega esto
})
export class ProfilePage implements OnInit {

  avatarUrl: string = 'assets/icon/favicon.png';
  user: any = {
    name: '',
    email: '',
    balance: 0,
    incomeMonth: 0,
    expenseMonth: 0
  };
  notifications: boolean = true;
  biometrics: boolean = false;

  constructor(private firebase: Firebase) { }

  ngOnInit() {
    const currentUser = this.firebase.getAuth().currentUser;
    if (currentUser) {
      this.user.name = currentUser.displayName || '';
      this.user.email = currentUser.email || '';
      this.avatarUrl = currentUser.photoURL || 'assets/icon/favicon.png';
      // Si tienes más datos en Firestore, aquí puedes obtenerlos y asignarlos
    }
  }

  onAvatarChange(event: any): void {
    // Aquí puedes agregar la lógica para cambiar el avatar
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  logout(): void {
    // Aquí puedes agregar la lógica de logout
    console.log('Cerrar sesión');
  }

}
