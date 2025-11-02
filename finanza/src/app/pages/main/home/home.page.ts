
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [SharedModule, FormsModule] // <-- Agrega esto
})
export class HomePage implements OnInit {

  constructor() {}

  ngOnInit() {

    
  }




    
}




