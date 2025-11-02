import { Component, OnInit, inject } from '@angular/core';
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

  categoria = '';
  esDeuda = false;
  movimientos: any[] = [];

  async ngOnInit() {
    this.categoria = this.route.snapshot.queryParamMap.get('cat') || '';
    this.esDeuda = this.categoria.toLowerCase().includes('deuda');
    await this.cargarMovimientos();
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
}
