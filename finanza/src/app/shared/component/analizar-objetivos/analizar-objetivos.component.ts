import { Component, OnInit, inject } from '@angular/core';
import { MovimientosApi } from 'src/app/services/apis/movimientos.api';
import { ObjetivoApi } from 'src/app/services/apis/objetivo.api';
import { Utils } from 'src/app/services/utils';

@Component({
  selector: 'app-analizar-objetivos',
  templateUrl: './analizar-objetivos.component.html',
  styleUrls: ['./analizar-objetivos.component.scss'],
  standalone: false,
})
export class AnalizarObjetivosComponent implements OnInit {
  objetivos: any[] = [];
  animar = false;
  disponible = 0;
  sinObjetivos = false;

  private objetivoApi = inject(ObjetivoApi);
  private movimientosApi = inject(MovimientosApi);
  private utilsSvc = inject(Utils);

  async ngOnInit() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // 1️⃣ Obtener movimientos
      const movimientos = await this.movimientosApi.obtenerMovimientos().toPromise();
      const { ingresos, gastos, deudas, disponible } = this.calcularResumenFinanciero(movimientos);
      this.disponible = disponible;

      // 2️⃣ Cargar categorías del localStorage
      const categorias = JSON.parse(localStorage.getItem('userCategorias') || '[]') || [];

      // 3️⃣ Obtener objetivos del backend
      const res = await this.objetivoApi.getObjetivos().toPromise();

      if (res.ok && res.objetivos.length > 0) {
        this.sinObjetivos = false;

        // 🔹 Paso 1: renderizar primero todos con progreso = 0
        this.objetivos = res.objetivos.map((obj: any) => {
          const cat = categorias.find(
            (c: any) => c.nombre === obj.categoria || c.id === obj.categoria
          );
          return {
            id: obj.id,
            nombre: obj.nombre,
            monto: obj.monto,
            categoria: cat?.nombre || obj.categoria,
            icono: cat?.icono || '🎯',
            color: cat?.color || '#00bcd4',
            progreso: 0,
            progresoReal: Math.min(this.disponible / obj.monto, 1),
          };
        });

        // 🔹 Paso 2: cerrar el loading y dejar que Angular pinte
        loading.dismiss();

        // 🔹 Paso 3: activar la animación y aplicar el progreso real después de un ciclo
        setTimeout(() => {
          this.animar = true;
          this.objetivos.forEach((o) => (o.progreso = o.progresoReal));
        }, 300);
      } else {
        this.sinObjetivos = true;
        loading.dismiss();
      }
    } catch (err) {
      console.error(err);
      loading.dismiss();
      this.utilsSvc.presentToast({
        message: 'Error al cargar objetivos',
        duration: 2500,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline',
      });
    }
  }

  async reload() {
    await this.ngOnInit();
  }

  private calcularResumenFinanciero(movimientos: any[]) {
    let ingresos = 0;
    let gastos = 0;
    let deudas = 0;

    for (const mov of movimientos) {
      switch (mov.tipo) {
        case 'ingreso':
          ingresos += Number(mov.monto || 0);
          break;
        case 'gasto':
          gastos += Number(mov.monto || 0);
          break;
        case 'deuda':
          deudas += Number(mov.monto || 0);
          break;
      }
    }

    const disponible = ingresos - (gastos + deudas);
    return { ingresos, gastos, deudas, disponible };
  }
}
