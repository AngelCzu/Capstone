import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DetalleObjetivoPageRoutingModule } from './detalle-objetivo-routing.module';

import { DetalleObjetivoPage } from './detalle-objetivo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DetalleObjetivoPageRoutingModule
  ],
})
export class DetalleObjetivoPageModule {}
