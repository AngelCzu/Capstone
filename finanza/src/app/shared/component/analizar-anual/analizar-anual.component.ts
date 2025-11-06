import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-analizar-anual',
  templateUrl: './analizar-anual.component.html',
  styleUrls: ['./analizar-anual.component.scss'],
  standalone: false,
})
export class AnalizarAnualComponent implements OnInit {
  resumenAnual: any[] = [];

  constructor() {}

  ngOnInit() {
    // 🔹 Datos mock para cada mes del año (ejemplo)
    this.resumenAnual = [
      { nombre: 'Enero', ingresos: 900000, gastos: 650000 },
      { nombre: 'Febrero', ingresos: 850000, gastos: 700000 },
      { nombre: 'Marzo', ingresos: 950000, gastos: 720000 },
      { nombre: 'Abril', ingresos: 980000, gastos: 690000 },
      { nombre: 'Mayo', ingresos: 1020000, gastos: 800000 },
      { nombre: 'Junio', ingresos: 970000, gastos: 710000 },
      { nombre: 'Julio', ingresos: 1000000, gastos: 750000 },
      { nombre: 'Agosto', ingresos: 930000, gastos: 760000 },
      { nombre: 'Septiembre', ingresos: 1100000, gastos: 850000 },
      { nombre: 'Octubre', ingresos: 1080000, gastos: 820000 },
      { nombre: 'Noviembre', ingresos: 980000, gastos: 700000 },
      { nombre: 'Diciembre', ingresos: 1200000, gastos: 950000 },
    ];
  }
}
