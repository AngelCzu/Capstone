import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule] // <-- Agrega esto

})
export class SignUpPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
