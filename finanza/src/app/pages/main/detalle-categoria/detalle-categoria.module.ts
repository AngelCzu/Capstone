import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DetalleCategoriaPageRoutingModule } from './detalle-categoria-routing.module';

import { DetalleCategoriaPage } from './detalle-categoria.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DetalleCategoriaPageRoutingModule,

  ],
})
export class DetalleCategoriaPageModule {}
