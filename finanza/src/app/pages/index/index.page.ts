import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-index',
  standalone: true,
  templateUrl: './index.page.html',
  styleUrls: ['./index.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule, SharedModule],
})
export class IndexPage implements OnInit {
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

