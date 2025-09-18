import { Component, OnInit } from '@angular/core';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.page.html',
  styleUrls: ['./agregar.page.scss'],
  imports: [SharedModule]
})
export class AgregarPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
