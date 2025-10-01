import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AnalizarPageRoutingModule } from './analizar-routing.module';

import { AnalizarPage } from './analizar.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AnalizarPageRoutingModule,
    AnalizarPage,
  ],
})
export class AnalizarPageModule {}
