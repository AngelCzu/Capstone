import { Component, OnInit, inject } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { MovimientosApi } from 'src/app/services/apis/movimientos.api';
import { ObjetivoApi } from 'src/app/services/apis/objetivo.api';
import { Utils } from 'src/app/services/utils';
import { GenericModalComponent } from '../modal-generic/modal-generic.component';

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
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController);


  async ngOnInit() {

    try {
      // 1️⃣ Obtener movimientos históricos
      const movimientos = await this.movimientosApi.obtenerMovimientos().toPromise();
      const { ingresos, gastos, deudas, disponible } = this.calcularResumenFinanciero(movimientos);
      this.disponible = disponible;

      // 2️⃣ Cargar categorías del localStorage
      const categorias = JSON.parse(localStorage.getItem('userCategorias') || '[]') || [];

      // 3️⃣ Obtener objetivos
      const res = await this.objetivoApi.getObjetivos().toPromise();

      if (res.ok && res.objetivos.length > 0) {
        this.sinObjetivos = false;

        // Preparar objetivos procesados (barras vacías al inicio)
        this.objetivos = res.objetivos.map((obj: any) => {
          const cat = categorias.find(
            (c: any) => c.nombre === obj.categoria || c.id === obj.categoria
          );

          const progreso = Math.min(this.disponible / obj.monto, 1);

          return {
            id: obj.id,
            nombre: obj.nombre,
            monto: obj.monto,
            categoria: cat?.nombre || obj.categoria,
            icono: cat?.icono || '🎯',
            color: cat?.color || '#00bcd4',
            progreso,
            tiempo: obj.tiempo
          };
        });

        // 🔹 cerrar el loading primero (para que el DOM se vea vacío)

        // 🔹 reiniciar el estado de animación
        this.animar = false;

        // 🔹 y recién después de un pequeño delay, activar la animación
        setTimeout(() => {
          this.animar = true;
        }, 400);
      } else {
        this.sinObjetivos = true;
      }
    } catch (err) {
      console.error(err);

      this.utilsSvc.presentToast({
        message: 'Error al cargar objetivos',
        duration: 2500,
        color: 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline',
      });
    }
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



  // ==================== 🗑️ ELIMINAR OBJETIVO ====================
async eliminarObjetivo(obj: any) {
  const alert = await this.alertCtrl.create({
    header: 'Eliminar objetivo',
    message: `¿Seguro que deseas eliminar <strong>${obj.nombre}</strong>?`,
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Eliminar',
        role: 'confirm',
        cssClass: 'danger',
        handler: async () => {
          const loading = await this.utilsSvc.loading();
          await loading.present();

          try {
            await this.objetivoApi.deleteObjetivo(obj.id).toPromise();
            this.utilsSvc.presentToast({
              message: 'Objetivo eliminado correctamente',
              color: 'success',
              icon: 'trash-outline',
            });
            this.ngOnInit(); // recarga la lista
          } catch {
            this.utilsSvc.presentToast({
              message: 'Error al eliminar el objetivo',
              color: 'danger',
            });
          } finally {
            loading.dismiss();
          }
        },
      },
    ],
  });

  await alert.present();
}

// ==================== ✏️ EDITAR OBJETIVO ====================
async editarObjetivo(obj: any) {
  const categorias = JSON.parse(localStorage.getItem('userCategorias') || '[]') || [];  
  console.log(obj);
  
  const modal = await this.modalCtrl.create({
    component: GenericModalComponent,
    cssClass: 'modal-editar-objetivo',
    componentProps: {
      title: 'Editar objetivo',
      color: 'primary',
      confirmText: 'Guardar cambios',
      cancelText: 'Cancelar',
      fields: [
        {
          name: 'nombre',
          label: 'Nombre del objetivo',
          type: 'text',
          required: true,
          default: obj.nombre,
        },
        {
          name: 'monto',
          label: 'Monto (CLP)',
          type: 'number',
          required: true,
          default: obj.monto,
        },
        {
          name: 'categoria',
          label: 'Categoría',
          type: 'select',
          required: true,
          default: obj.categoria,
          options: categorias.filter((c: any) => c.tipo === 'objetivo').map((c: any) => ({
            value: c.nombre,
            label: `${c.icono || '💠'} ${c.nombre}`,
          })),
        },
        {
          name: 'tiempo',
          label: 'Tiempo (meses)',
          type: 'number',
          required: false,
          default: obj.tiempo || '',
        },
      ],
    },
  });

  await modal.present();

  const { data, role } = await modal.onWillDismiss();
  console.log('Role:', role, 'Data:', data);
  if (role === 'confirm' && data) {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      await this.objetivoApi.updateObjetivo(obj.id, data).toPromise();

      // 🔹 Actualiza localmente
      Object.assign(obj, data);

      this.utilsSvc.presentToast({
        message: 'Objetivo actualizado correctamente',
        color: 'success',
        duration: 2000,
        icon: 'checkmark-circle-outline',
      });
    } catch (err) {
      this.utilsSvc.presentToast({
        message: 'Error al actualizar objetivo',
        color: 'danger',
        duration: 2500,
        icon: 'alert-circle-outline',
      });
    } finally {
      loading.dismiss();
    }
  }
}


}
