import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AnalizarPage } from './analizar.page';

const routes: Routes = [
  {
    path: '',
    component: AnalizarPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalizarPageRoutingModule {}
