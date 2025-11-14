import { Component, OnInit, inject } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MovimientosApi } from 'src/app/services/apis/movimientos.api';

import { Utils } from 'src/app/services/utils';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-historico',
  templateUrl: './historico.page.html',
  styleUrls: ['./historico.page.scss'],
  imports: [SharedModule]
})
export class HistoricoPage implements OnInit {
  private fb = inject(FormBuilder);
  private moviApi = inject(MovimientosApi);
  private utilsSvc = inject(Utils);

  form!: FormGroup;
  movimientos: any[] = [];
  movimientosFiltrados: any[] = [];
  categorias: string[] = [];
  filtrosAbiertos = false;

  ngOnInit() {
    this.form = this.fb.group({
      tipo: ['todos'],
      categoria: ['todas'],
      busqueda: ['']
    });

    this.cargarMovimientos();

    // Escucha de cambios automáticos (busqueda reactiva)
    this.form.valueChanges.subscribe(() => this.aplicarFiltrosManual());
  }

  async cargarMovimientos() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      const data = await this.moviApi.obtenerMovimientos().toPromise();
      this.movimientos = data.sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      this.movimientosFiltrados = [...this.movimientos];
      this.categorias = [...new Set(this.movimientos.map(m => m.categoria || 'Sin categoría'))];
    } catch (err) {
      console.error(err);
      this.utilsSvc.presentToast({
        message: 'Error al cargar movimientos',
        color: 'danger',
        duration: 2000,
        position: 'bottom',
      });
    } finally {
      loading.dismiss();
    }
  }

  toggleFiltros() {
    this.filtrosAbiertos = !this.filtrosAbiertos;
  }

  aplicarFiltrosManual() {
    const { tipo, categoria, busqueda } = this.form.value;
    const term = busqueda?.toLowerCase().trim();

    this.movimientosFiltrados = this.movimientos.filter(m => {
      const tipoOk = tipo === 'todos' || m.tipo === tipo;
      const catOk = categoria === 'todas' || m.categoria === categoria;
      const searchOk = !term || (
        m.origen?.toLowerCase().includes(term) ||
        m.categoria?.toLowerCase().includes(term) ||
        m.tipo?.toLowerCase().includes(term) ||
        m.moneda?.toLowerCase().includes(term)
      );
      return tipoOk && catOk && searchOk;
    });
  }

  getIconoTipo(tipo: string): string {
  switch (tipo) {
    case 'ingreso': return 'cash-outline';
    case 'gasto': return 'cart-outline';
    case 'deuda': return 'card-outline';
    case 'objetivo': return 'trophy-outline';
    case 'ahorro': return 'wallet-outline'; 
    default: return 'help-outline';
  }
}


  async eliminarMovimiento(mov: any) {
    const confirmed = await this.utilsSvc.presentConfirmSheet({
      title: 'Eliminar movimiento',
      message: `¿Seguro que deseas eliminar "${mov.origen}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      color: 'danger',
      icon: 'trash-outline'
    });

    if (!confirmed) return;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      await this.moviApi.eliminarMovimiento(mov.id, mov.tipo).toPromise();
      this.movimientos = this.movimientos.filter(m => m.id !== mov.id);
      this.aplicarFiltrosManual();

      this.utilsSvc.presentToast({
        message: 'Movimiento eliminado correctamente',
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });
    } catch (error: any) {
      console.error(error);
      this.utilsSvc.presentToast({
        message: 'Error al eliminar movimiento',
        duration: 2500,
        color: 'danger',
        position: 'bottom',
      });
    } finally {
      loading.dismiss();
    }
  }

  async onRefresh(event: RefresherCustomEvent) {
    try {
      await this.cargarMovimientos();
    } finally {
      try { event.target.complete(); } catch {}
    }
  }
}
