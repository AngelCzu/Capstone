import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Firebase } from 'src/app/services/firebase';
import { Utils } from 'src/app/services/utils';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [SharedModule, FormsModule] // <-- Agrega esto
})
export class HomePage implements OnInit {

  // supuesto: lo llenas desde tu servicio real
  totalIncome = 146.6; // GB ~ ingresos (ejemplo)
  expenses = [
    { label: 'Aplicaciones y datos', color: '#f4c20d', value: 98.68 },
    { label: 'Fotos',                color: '#ff8c00', value: 2.72  },
    { label: 'Audio',                color: '#ff4d4d', value: 0.033 },
    { label: 'Video',                color: '#ad44ff', value: 4.55  },
    { label: 'Documentos',           color: '#3bd16f', value: 6.02  },
    { label: 'Archivos del sistema', color: '#6272ff', value: 25.35 },
    { label: 'Sistema',              color: '#9aa0a6', value: 9.19  },
  ];

  // ejemplo de cambio dinámico: llegan más ingresos
  simularIngresoExtra() {
    this.totalIncome += 10; // la barra se reescala automáticamente
  }



  // Inyectar servicios 
  firebaseSvc = inject(Firebase);
  utilsSvc = inject(Utils);


  
// Donut / dashboard state
  amount = 2500;                 // $2.500 al centro
  percent = 82;                  // % del anillo en verde
  period: '15D' | '1M' | '1Y' = '1M';

  // Convierte el porcentaje a grados para el conic-gradient del donut
  get donutDeg(): string {
    return `${(this.percent / 100) * 360}deg`;
  }

  // (Opcional) si enlazas ion-segment al periodo
  setPeriod(p: '15D' | '1M' | '1Y') {
    this.period = p;
    // Demo: ajusta el % según el periodo (reemplázalo con tus datos reales)
    if (p === '15D') this.percent = 65;
    else if (p === '1M') this.percent = 82;
    else this.percent = 74;
  }

  constructor() {}

  ngOnInit() {}

}




