import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule] // <-- Agrega esto

})
export class ForgotPasswordPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
