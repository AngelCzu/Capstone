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

  private currentUserName = ''; // para “mi parte” en compartidos

  async ngOnInit() {
    await this.cargarTodo();
  }

  // ==================== CARGA ====================
  private async cargarTodo() {
    try {
      this.currentUserName = this.obtenerNombreUsuario();

      // 1) Movimientos para “disponible” (mantienes tu resumen)
      const movimientos = await this.movimientosApi.obtenerMovimientos().toPromise();
      const { ingresos, gastos, deudas, disponible } = this.calcularResumenFinanciero(movimientos || []);
      this.disponible = disponible;

      // 2) Categorías del localStorage
      const categorias = JSON.parse(localStorage.getItem('userCategorias') || '[]') || [];

      // 3) Objetivos enriquecidos
      const res = await this.objetivoApi.getObjetivos().toPromise();

      if (res?.ok && Array.isArray(res.objetivos) && res.objetivos.length > 0) {
        this.sinObjetivos = false;

        this.objetivos = res.objetivos.map((obj: any) => {
          const cat = categorias.find((c: any) => c.nombre === obj.categoria || c.id === obj.categoria);

          // Progreso GLOBAL (total / meta)
          const progresoGlobal = (obj?.monto > 0)
            ? (Number(obj?.progresoGlobal || 0) / Number(obj.monto))
            : 0;

          // Progreso PERSONAL si es compartido
          const { progreso: progresoPersonal, completoPersonal } = this.calcularProgresoPersonal(obj);

          // Elegimos qué mostrar: mi parte (si aplica) o global
          let progreso = (obj?.compartido && progresoPersonal !== null) ? progresoPersonal! : progresoGlobal;

          // Redondeo defensivo; si está completo, forzar 1 para activar brillo
          progreso = Math.max(0, Math.min(1, Number(progreso.toFixed(4))));
          const completo = (obj?.compartido && progresoPersonal !== null)
            ? completoPersonal
            : (Number(obj?.restanteGlobal || 0) === 0);

          return {
            id: obj.id,
            nombre: obj.nombre,
            monto: obj.monto,
            categoria: cat?.nombre || obj.categoria,
            icono: cat?.icono || obj.icono || '🎯',
            color: cat?.color || obj.color || '#00bcd4',
            tiempo: obj.tiempo,

            // Lo que usa tu HTML para la barra/animación
            progreso: completo ? 1 : progreso,

            // Info adicional (no rompe tu HTML)
            mesesRestantes: obj?.mesesRestantes ?? null,
            cuotaRecomendada: obj?.plan?.cuotaRecomendada ?? null,
            fechaFinEstimada: obj?.fechaFinEstimada ?? null,
          };
        });

        // Animación suave como ya hacías
        this.animar = false;
        setTimeout(() => { this.animar = true; }, 400);
      } else {
        this.sinObjetivos = true;
        this.objetivos = [];
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

  // ==================== HELPERS ====================
  private obtenerNombreUsuario(): string {
    const profile = JSON.parse(localStorage.getItem('userProfile') || 'null');
    if (profile?.name) return profile.name;
    if (profile?.displayName) return profile.displayName;
    if (profile?.email) return String(profile.email).split('@')[0];
    return '';
  }

  private calcularProgresoPersonal(obj: any): { progreso: number | null; completoPersonal: boolean } {
    try {
      if (!obj?.compartido || !Array.isArray(obj?.participantes)) {
        return { progreso: null, completoPersonal: false };
      }

      const miNombre = this.currentUserName;
      if (!miNombre) return { progreso: null, completoPersonal: false };

      const total = Number(obj?.monto || 0);
      const me = obj.participantes.find((p: any) => p?.nombre === miNombre);
      if (!me) return { progreso: null, completoPersonal: false };

      // Meta personal
      const metaPersonal =
        obj?.modoDivision === 'porcentaje'
          ? Math.round(total * ((Number(me?.porcentaje || 0)) / 100))
          : Math.round(Number(me?.monto || 0));

      if (metaPersonal <= 0) return { progreso: 0, completoPersonal: false };

      // Aportes personales (backend ya trae el resumen)
      const aportes = obj?.aportesPorParticipante || {};
      const aportePersonal = Number(aportes[miNombre] || 0);

      const progreso = aportePersonal / metaPersonal;
      const completoPersonal = aportePersonal >= metaPersonal;

      return { progreso, completoPersonal };
    } catch {
      return { progreso: null, completoPersonal: false };
    }
  }

  private calcularResumenFinanciero(movimientos: any[]) {
    let ingresos = 0, gastos = 0, deudas = 0;
    for (const mov of (movimientos || [])) {
      switch (mov?.tipo) {
        case 'ingreso': ingresos += Number(mov?.monto || 0); break;
        case 'gasto':   gastos   += Number(mov?.monto || 0); break;
        case 'deuda':   deudas   += Number(mov?.monto || 0); break;
      }
    }
    const disponible = ingresos - (gastos + deudas);
    return { ingresos, gastos, deudas, disponible };
  }

  // ==================== 🗑️ ELIMINAR ====================
  async eliminarObjetivo(obj: any) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar objetivo',
      message: `¿Seguro que deseas eliminar <strong>${obj?.nombre}</strong>?`,
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
              this.utilsSvc.presentToast({ message: 'Objetivo eliminado correctamente', color: 'success', icon: 'trash-outline' });
              await this.cargarTodo();
            } catch {
              this.utilsSvc.presentToast({ message: 'Error al eliminar el objetivo', color: 'danger' });
            } finally {
              loading.dismiss();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // ==================== ✏️ EDITAR ====================
  async editarObjetivo(obj: any) {
    const categorias = JSON.parse(localStorage.getItem('userCategorias') || '[]') || [];

    const modal = await this.modalCtrl.create({
      component: GenericModalComponent,
      cssClass: 'modal-editar-objetivo',
      componentProps: {
        title: 'Editar objetivo',
        color: 'primary',
        confirmText: 'Guardar cambios',
        cancelText: 'Cancelar',
        fields: [
          { name: 'nombre', label: 'Nombre del objetivo', type: 'text',   required: true,  default: obj?.nombre },
          { name: 'monto',  label: 'Monto (CLP)',         type: 'number', required: true,  default: obj?.monto },
          {
            name: 'categoria',
            label: 'Categoría',
            type: 'select',
            required: true,
            default: obj?.categoria,
            options: categorias
              .filter((c: any) => c?.tipo === 'objetivo')
              .map((c: any) => ({ value: c?.nombre, label: `${c?.icono || '💠'} ${c?.nombre}` })),
          },
          { name: 'tiempo', label: 'Tiempo (meses)', type: 'number', required: false, default: obj?.tiempo || '' },
        ],
      },
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role !== 'confirm' || !data) return;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      await this.objetivoApi.updateObjetivo(obj.id, data).toPromise();
      await this.cargarTodo();
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

  // ==================== 💰 APORTAR ====================
  async abrirModalAportar(obj: any) {
    const modal = await this.modalCtrl.create({
      component: GenericModalComponent,
      cssClass: 'modal-aportar-objetivo',
      componentProps: {
        title: `Aportar a ${obj?.nombre}`,
        color: 'tertiary',
        confirmText: 'Aportar',
        cancelText: 'Cancelar',
        fields: [
          { name: 'monto', label: 'Monto (CLP)', type: 'number', required: true, default: '' },
          {
            name: 'estrategia',
            label: 'Estrategia',
            type: 'select',
            required: true,
            default: 'mantener_plazo',
            options: [
              { value: 'mantener_plazo', label: 'Mantener plazo (sube cuota)' },
              { value: 'ajustar_plazo', label: 'Ajustar plazo (más meses)' },
              { value: 'recuperar_en_x_meses', label: 'Recuperar en X meses' },
            ],
          },
          { name: 'recuperarEnMeses', label: 'Recuperar en (meses)', type: 'number', required: false, default: '' },
        ],
      },
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role !== 'confirm' || !data) return;

    // Validación rápida
    const monto = Number(data.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      this.utilsSvc.presentToast({ message: 'Monto inválido', color: 'warning', duration: 1800, position: 'bottom' });
      return;
    }

    const loading = await this.utilsSvc.loading();
    await loading.present();
    try {
      await this.objetivoApi.aportarAObjetivo(obj.id, {
        monto,
        estrategia: data.estrategia,
        recuperarEnMeses: data.recuperarEnMeses ? Number(data.recuperarEnMeses) : undefined,
        participante: obj?.compartido ? this.currentUserName : undefined,
      }).toPromise();

      this.utilsSvc.presentToast({
        message: 'Aporte registrado',
        duration: 1800,
        color: 'success',
        position: 'bottom',
      });
      await this.cargarTodo(); // refrescar para ver la barra avanzar/brillo
    } catch (e: any) {
      this.utilsSvc.presentToast({
        message: e?.error?.error || e?.message || 'Error al aportar',
        duration: 2200,
        color: 'danger',
        position: 'bottom',
      });
    } finally {
      loading.dismiss();
    }
  }


verDetalleObjetivo(obj: any) {
  if (!obj?.id) return;
  const url = `/main/detalle-objetivo?id=${encodeURIComponent(obj.id)}`;
  this.utilsSvc.routerLink(url);
}
async reload() {
    await this.ngOnInit();
  }
}  