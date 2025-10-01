import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-analizar',
  templateUrl: './analizar.page.html',
  styleUrls: ['./analizar.page.scss'], 
  standalone: true,
  imports: [SharedModule, CommonModule, FormsModule, IonicModule],
})
export class AnalizarPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
