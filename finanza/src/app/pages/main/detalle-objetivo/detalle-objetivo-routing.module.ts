import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DetalleObjetivoPage } from './detalle-objetivo.page';

const routes: Routes = [
  {
    path: '',
    component: DetalleObjetivoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DetalleObjetivoPageRoutingModule {}
