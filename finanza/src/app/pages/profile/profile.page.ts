import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage {
  user = {
    name: 'Cristopher Arredondo',
    email: 'cris@tuapp.com',
    joined: '2024-01-10',
    balance: 2500,
    incomeMonth: 4200,
    expenseMonth: 1700,
  };

  notifications = true;
  biometrics = false;

  avatarUrl = 'https://ionicframework.com/docs/img/demos/avatar.svg';

  onAvatarChange(ev: any) {
    const file = ev?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (this.avatarUrl = String(reader.result));
    reader.readAsDataURL(file);
  }

  logout() { /* TODO: tu lógica de logout */ }
}
