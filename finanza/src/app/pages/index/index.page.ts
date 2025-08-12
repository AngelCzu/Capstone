import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-index',
  templateUrl: './index.page.html',
  styleUrls: ['./index.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule] // <-- Agrega esto
})
export class IndexPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
