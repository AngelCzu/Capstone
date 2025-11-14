import { Component, OnInit, inject } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UserApi } from 'src/app/services/apis/user.api';
import { Utils } from 'src/app/services/utils';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-detalle-categoria',
  templateUrl: './detalle-categoria.page.html',
  styleUrls: ['./detalle-categoria.page.scss'],
  imports: [SharedModule, ]
})
export class DetalleCategoriaPage implements OnInit {
  route = inject(ActivatedRoute);
  userApi = inject(UserApi);
  utilsSvc = inject(Utils);
  private fb = inject(FormBuilder);

  categoria = '';
  esDeuda = false;
  movimientos: any[] = [];
  movimientosFiltrados: any[] = [];
  form!: FormGroup;
  async ngOnInit() {
    this.categoria = this.route.snapshot.queryParamMap.get('cat') || '';
    this.esDeuda = this.categoria.toLowerCase().includes('deuda');
    

    this.form = this.fb.group({
      busqueda: ['']
    });

    // Escucha de cambios automáticos (busqueda reactiva)
    this.form.valueChanges.subscribe(() => this.aplicarFiltrosManual());

    await this.cargarMovimientos();
  }

  async onRefresh(event: RefresherCustomEvent) {
    try {
      await this.cargarMovimientos();
    } finally {
      try { event.target.complete(); } catch {}
    }
  }

  async cargarMovimientos() {
    const loading = await this.utilsSvc.loading();
    await loading.present();
    try {
      const data: any = await this.userApi.obtenerPorCategoria(this.categoria).toPromise();
      this.movimientos = data || [];
    } catch (error) {
      console.error('❌ Error al cargar movimientos:', error);
      this.utilsSvc.presentToast({
        message: 'Error al cargar movimientos de la categoría',
        color: 'danger',
        duration: 2500,
      });
    } finally {
      loading.dismiss();
    }
  }

  aplicarFiltrosManual() {
    const busqueda = this.form.value;
    const term = busqueda?.toLowerCase().trim();

    this.movimientosFiltrados = this.movimientos.filter(m => {
      const searchOk = !term || (
        m.origen?.toLowerCase().includes(term) ||
        m.categoria?.toLowerCase().includes(term) ||
        m.tipo?.toLowerCase().includes(term) ||
        m.moneda?.toLowerCase().includes(term)
      );
      return searchOk;
    });
  }





}
