import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UserApi } from 'src/app/services/apis/user.api';
import { Utils } from 'src/app/services/utils';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-detalle-categoria',
  templateUrl: './detalle-categoria.page.html',
  styleUrls: ['./detalle-categoria.page.scss'],
  imports: [SharedModule]
})
export class DetalleCategoriaPage implements OnInit {
  route = inject(ActivatedRoute);
  userApi = inject(UserApi);
  utilsSvc = inject(Utils);
  fb = inject(FormBuilder);

  categoria = '';
  esDeuda = false;
  movimientos: any[] = [];
  movimientosFiltrados: any[] = [];

  form!: FormGroup;

  async ngOnInit() {
    this.categoria = this.route.snapshot.queryParamMap.get('cat') || '';
    this.esDeuda = this.categoria.toLowerCase().includes('deuda');

    // 🔍 Inicializar form
    this.form = this.fb.group({
      busqueda: ['']
    });

    await this.cargarMovimientos();

    // 🔁 Reactividad para búsqueda
    this.form.get('busqueda')?.valueChanges.subscribe((texto: string) => {
      this.aplicarFiltro(texto);
    });
  }

  async cargarMovimientos() {
    const loading = await this.utilsSvc.loading();
    await loading.present();
    try {
      const data: any = await this.userApi.obtenerPorCategoria(this.categoria).toPromise();
      this.movimientos = data || [];
      this.movimientosFiltrados = [...this.movimientos];
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

  aplicarFiltro(texto: string) {
    if (!texto) {
      this.movimientosFiltrados = [...this.movimientos];
      return;
    }

    const t = texto.toLowerCase().trim();
    this.movimientosFiltrados = this.movimientos.filter(mov =>
      mov.origen?.toLowerCase().includes(t) ||
      mov.categoria?.toLowerCase().includes(t) ||
      mov.descripcion?.toLowerCase().includes(t)
    );
  }
}
