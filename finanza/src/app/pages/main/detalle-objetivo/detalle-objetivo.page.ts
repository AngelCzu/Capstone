import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { ObjetivoApi } from 'src/app/services/apis/objetivo.api';
import { MovimientosApi } from 'src/app/services/apis/movimientos.api';
import { Utils } from 'src/app/services/utils';
import { GenericModalComponent } from 'src/app/shared/component/modal-generic/modal-generic.component';
import { SharedModule } from 'src/app/shared/shared-module';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-detalle-objetivo',
  templateUrl: './detalle-objetivo.page.html',
  styleUrls: ['./detalle-objetivo.page.scss'],
  imports: [SharedModule],
})
export class DetalleObjetivoPage implements OnInit {

  // ==================== PROPIEDADES ====================
  objetivo: any = null;
  historial: Array<{ id: string; monto: number; fecha: string; participante?: string | null }> = [];
  loading = false;
  animar = false; // para animar la barra
  saldoDisponible: number = 0; // 💰 saldo global del usuario

  // ==================== INYECCIONES ====================
  private route = inject(ActivatedRoute);
  private objetivoApi = inject(ObjetivoApi);
  private movimientosApi = inject(MovimientosApi);
  private utilsSvc = inject(Utils);
  private modalCtrl = inject(ModalController);
  private http      = inject(HttpClient)

  // ==================== CICLO DE VIDA ====================
  async ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (!id) {
      this.utilsSvc.presentToast({ message: 'Objetivo no encontrado', color: 'danger', duration: 2000 });
      this.utilsSvc.routerLink('/main/analizar');
      return;
    }

    await this.cargarObjetivo(id);
    await this.cargarSaldoDisponible(); // 💰 carga global
    await this.cargarHistorial();
    await this.verificarReajustePendiente();


    // pequeña demora para animar barra
    setTimeout(() => (this.animar = true), 400);
  }

  // ==================== GETTERS DE PRESENTACIÓN ====================
  get nombre() { return this.objetivo?.nombre || ''; }
  get icono() { return this.objetivo?.icono || '🎯'; }
  get color() { return this.objetivo?.color || '#00bcd4'; }

  get monto(): number { return Number(this.objetivo?.monto || 0); }
  get cuota(): number | null {
    return Number(this.objetivo?.plan?.cuotaRecomendada || this.objetivo?.cuotaRecomendada || 0) || null;
  }
  get meses(): number | null {
    return Number(this.objetivo?.mesesRestantes || this.objetivo?.plan?.mesesObjetivo || this.objetivo?.tiempo || 0) || null;
  }
  get fin(): string | null { return this.objetivo?.fechaFinEstimada || null; }

  // ======= Cálculos numéricos =======
  get ahorrado(): number { return Number(this.objetivo?.progresoGlobal || 0); }
  get restante(): number { return Math.max(0, this.monto - this.ahorrado); } // 🎯 restante para la meta

  get progresoPct(): number {
    if (this.monto <= 0) return 0;
    const pct = (this.ahorrado / this.monto) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }

  get completo(): boolean {
    return this.monto > 0 && this.ahorrado >= this.monto;
  }

  get hintProgreso(): string {
    const parts: string[] = [];
    parts.push(`Progreso: ${this.progresoPct}%`);
    if (this.cuota) parts.push(`Recomendado: ${this.cuota}/mes`);
    if (this.meses) parts.push(`${this.meses} meses`);
    return parts.join(' • ');
  }

  // ==================== CARGA DE DATOS ====================
async cargarObjetivo(id: string) {
  try {
    const res: any = await this.objetivoApi.getObjetivoDetalle(id).toPromise();
    if (!res?.ok || !res?.objetivo) {
      this.utilsSvc.presentToast({
        message: 'No se encontró el objetivo solicitado',
        color: 'warning',
        duration: 2000,
      });
      return;
    }

    const obj = res.objetivo;

    // Buscar categoría localmente
    const categorias = JSON.parse(localStorage.getItem('userCategorias') || '[]') || [];
    const categoria = categorias.find((c: any) =>
      c.nombre === obj.categoria || c.id === obj.categoria
    );

    // Enriquecer datos
    this.objetivo = {
      id,
      ...obj,
      icono: categoria?.icono || obj.icono || '🎯',
      color: categoria?.color || obj.color || '#00bcd4',
      categoriaNombre: categoria?.nombre || obj.categoria || 'Sin categoría',
    };

  } catch (err) {
    console.error('Error al cargar objetivo:', err);
    this.utilsSvc.presentToast({
      message: 'Error al cargar objetivo',
      color: 'danger',
      duration: 2000,
    });
  }
}



  async cargarSaldoDisponible() {
    try {
      const res: any = await this.http.get('/api/v1/users/me/resumen').toPromise();

      const total = res.ingresos || 1;
      const ocupados = res.gastos + res.deudas;
      
      this.saldoDisponible = Math.round(total - ocupados) || 0;
    } catch (err) {
      console.error('Error al cargar saldo disponible:', err);
      this.saldoDisponible = 0;
    }
  }

  async cargarHistorial() {
    if (!this.objetivo?.id) return;
    this.loading = true;
    try {
      const res = await this.objetivoApi.getHistorialAhorros(this.objetivo.id).toPromise();
      this.historial = res?.ok ? res.items : [];
    } catch (e) {
      console.error(e);
      this.utilsSvc.presentToast({ message: 'No se pudo cargar el historial', color: 'danger', duration: 2000 });
    } finally {
      this.loading = false;
    }
  }

  async verificarReajustePendiente() {
    if (!this.objetivo?.plan?.reajustePendiente) return;

    const decision = await this.utilsSvc.presentConfirmSheet({
      title: 'Ajuste de planificación',
      message: `
        Ha pasado al menos un mes y no alcanzaste el aporte recomendado
        (<b>${new Intl.NumberFormat('es-CL').format(this.objetivo.plan.cuotaRecomendada)} CLP/mes</b>).
        ¿Deseas redistribuir el faltante entre los meses restantes o extender el plazo de tu meta?
      `,
      confirmText: 'Redistribuir',
      cancelText: 'Extender plazo',
      color: 'tertiary',
      icon: 'time-outline',
      breakpoints: [0.5],
      initialBreakpoint: 0.5,
      cssClass: 'confirm-sheet-centered',
      onBackdropRedirect: '/main/analizar',
      utils: this.utilsSvc,
    });

    if (decision === 'redirected') return;

    try {
      if (decision) {
        // ✅ Redistribuir faltante
        await this.objetivoApi.reajustarPlan(this.objetivo.id, {
          estrategia: 'mantener_plazo'
        });

        this.utilsSvc.presentToast({
          message: 'El plan fue ajustado redistribuyendo el faltante 💡',
          color: 'success',
          duration: 2000,
        });
      } else {
        // ✅ Extender plazo
        const modal = await this.modalCtrl.create({
          component: GenericModalComponent,
          cssClass: 'modal-ajustar-plazo',
          componentProps: {
            title: 'Extender plazo del objetivo',
            color: 'tertiary',
            confirmText: 'Guardar',
            cancelText: 'Cancelar',
            fields: [
              {
                name: 'nuevosMeses',
                label: 'Nuevo número de meses',
                type: 'number',
                required: true,
                default: this.objetivo.plan.mesesObjetivo || '',
              },
            ],
          },
        });

        await modal.present();
        const { data, role } = await modal.onWillDismiss();
        if (role === 'confirm' && data?.nuevosMeses) {
          await this.objetivoApi.aportarAObjetivo(this.objetivo.id, {
            monto: 1,
            estrategia: 'ajustar_plazo',
            recuperarEnMeses: Number(data.nuevosMeses),
          }).toPromise();

          this.utilsSvc.presentToast({
            message: 'El plazo fue extendido correctamente 🗓️',
            color: 'success',
            duration: 2000,
          });
        }
      }
      console.log(this.objetivo.id);
      
      // ✅ Avisar al backend que ya se realizó el reajuste del mes
      await this.objetivoApi.marcarReajusteProcesado(this.objetivo.id).toPromise();

      // 🔄 Recargar objetivo actualizado
      await this.cargarObjetivo(this.objetivo.id);
    } catch (error) {
      console.error('Error durante el reajuste:', error);
      this.utilsSvc.presentToast({
        message: 'No se pudo completar el ajuste',
        color: 'danger',
        duration: 2000,
      });
    }
  }



  // ==================== ACCIONES OBJETIVO ====================
  async editarObjetivo() {
    const categorias = JSON.parse(localStorage.getItem('userCategorias') || '[]') || [];
    const modal = await this.modalCtrl.create({
      component: GenericModalComponent,
      cssClass: 'modal-editar-objetivo',
      componentProps: {
        title: 'Editar objetivo',
        color: 'primary',
        confirmText: 'Guardar',
        cancelText: 'Cancelar',
        fields: [
          { name: 'nombre', label: 'Nombre del objetivo', type: 'text', required: true, default: this.nombre },
          { name: 'monto', label: 'Monto (CLP)', type: 'number', required: true, default: this.monto },
          {
            name: 'categoria',
            label: 'Categoría',
            type: 'select',
            required: true,
            default: this.objetivo?.categoria,
            options: categorias
              .filter((c: any) => c?.tipo === 'objetivo')
              .map((c: any) => ({ value: c?.nombre, label: `${c?.icono || '💠'} ${c?.nombre}` })),
          },
          { name: 'tiempo', label: 'Tiempo (meses)', type: 'number', required: false, default: this.meses || '' },
        ],
      },
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role !== 'confirm' || !data) return;

    const loading = await this.utilsSvc.loading();
    await loading.present();
    try {
      await this.objetivoApi.updateObjetivo(this.objetivo.id, data).toPromise();
      await this.objetivoApi.recalcularPlanObjetivo(this.objetivo.id).toPromise();
      await this.cargarObjetivo(this.objetivo.id);
      this.utilsSvc.presentToast({ message: 'Objetivo actualizado', color: 'success', duration: 1600 });
    } catch {
      this.utilsSvc.presentToast({ message: 'Error al actualizar', color: 'danger', duration: 2000 });
    } finally {
      loading.dismiss();
    }
  }

  async eliminarObjetivo() {
    const confirmed = await this.utilsSvc.presentConfirmSheet({
      title: 'Eliminar objetivo',
      message: `¿Seguro que deseas eliminar <b>${this.nombre}</b>?`,
      confirmText: 'Eliminar objetivo',
      cancelText: 'Cancelar',
      color: 'danger',
      icon: 'trash-outline',
    });
    if (!confirmed) return;

    const loading = await this.utilsSvc.loading();
    await loading.present();
    try {
      await this.objetivoApi.deleteObjetivo(this.objetivo.id).toPromise();
      this.utilsSvc.presentToast({ message: 'Objetivo eliminado', color: 'success', duration: 1600 });
      this.utilsSvc.routerLink('/main/analizar');
    } catch {
      this.utilsSvc.presentToast({ message: 'Error al eliminar', color: 'danger', duration: 2000 });
    } finally {
      loading.dismiss();
    }
  }

  // ==================== ACCIONES APORTES ====================
  async agregarAporte() {
    // 🧩 Validaciones iniciales
    if (this.saldoDisponible <= 0) {
      this.utilsSvc.presentToast({
        message: 'No tienes saldo disponible para realizar un aporte',
        color: 'danger',
        duration: 2000
      });
      return;
    }

    if (this.restante <= 0) {
      this.utilsSvc.presentToast({
        message: 'Tu meta ya está completa 🎯',
        color: 'warning',
        duration: 2000
      });
      return;
    }

    // === Modal base para ingreso de monto ===
    const modal = await this.modalCtrl.create({
      component: GenericModalComponent,
      cssClass: 'modal-aportar-objetivo',
      componentProps: {
        title: `Aportar a ${this.nombre}`,
        color: 'tertiary',
        confirmText: 'Aportar',
        cancelText: 'Cancelar',
        fields: [
          { name: 'monto', label: 'Monto (CLP)', type: 'number', required: true, default: '' },
        ],
        extraInfo: [
          {
            label: 'Saldo disponible',
            value: `CLP ${new Intl.NumberFormat('es-CL').format(this.saldoDisponible)}`,
            color: '#7fe1b5',
            icon: 'wallet-outline',
          },
          {
            label: 'Faltante para meta',
            value: `CLP ${new Intl.NumberFormat('es-CL').format(this.restante)}`,
            color: '#ffb84d',
            icon: 'trending-down-outline',
          },
          ...(this.cuota
            ? [{
                label: 'Aporte recomendado mensual',
                value: `CLP ${new Intl.NumberFormat('es-CL').format(this.cuota)}`,
                color: '#4dbfff',
                icon: 'trending-up-outline',
              }]
            : []),
        ],
      },
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role !== 'confirm' || !data) return;

    const monto = Number(data.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      this.utilsSvc.presentToast({
        message: 'Monto inválido',
        color: 'warning',
        duration: 1600
      });
      return;
    }

    // === Validaciones previas ===
    if (monto > this.saldoDisponible) {
      this.utilsSvc.presentToast({
        message: `El monto ingresado supera tu saldo disponible (${new Intl.NumberFormat('es-CL').format(this.saldoDisponible)} CLP).`,
        color: 'danger',
        duration: 2500
      });
      return;
    }

    if (monto > this.restante) {
      this.utilsSvc.presentToast({
        message: `El monto ingresado supera el faltante de tu meta (${new Intl.NumberFormat('es-CL').format(this.restante)} CLP).`,
        color: 'warning',
        duration: 2500
      });
      return;
    }

    // === 🔹 Si el monto es menor al recomendado ===
    if (this.cuota && monto < this.cuota) {
      const mantenerPlazo = await this.utilsSvc.presentConfirmSheet({
        title: 'Monto menor al recomendado',
        message: `Tu aporte es menor al recomendado (${new Intl.NumberFormat('es-CL').format(this.cuota)} CLP/mes). ¿Quieres mantener el plazo actual y redistribuir el faltante?`,
        confirmText: 'Mantener plazo',
        cancelText: 'Cambiar plazo',
        color: 'tertiary',
        icon: 'calendar-outline'
      });

      if (!mantenerPlazo) {
        // 🔸 Usuario quiere cambiar el plazo → mostrar segundo modal
        const modalPlazo = await this.modalCtrl.create({
          component: GenericModalComponent,
          cssClass: 'modal-ajustar-plazo',
          componentProps: {
            title: 'Ajustar plazo',
            color: 'tertiary',
            confirmText: 'Guardar',
            cancelText: 'Cancelar',
            fields: [
              {
                name: 'nuevosMeses',
                label: 'Nuevo número de meses',
                type: 'number',
                required: true,
                default: this.meses || '',
              },
            ],
          },
        });

        await modalPlazo.present();
        const { data: dataPlazo, role: rolePlazo } = await modalPlazo.onWillDismiss();
        if (rolePlazo !== 'confirm' || !dataPlazo) return;

        const nuevosMeses = Number(dataPlazo.nuevosMeses);
        if (!nuevosMeses || nuevosMeses <= 0) {
          this.utilsSvc.presentToast({
            message: 'Número de meses inválido',
            color: 'warning',
            duration: 1500,
          });
          return;
        }

        await this.objetivoApi.aportarAObjetivo(this.objetivo.id, {
          monto,
          estrategia: 'ajustar_plazo',
          recuperarEnMeses: nuevosMeses,
        }).toPromise();
      } else {
        // 🔹 Usuario quiere mantener el plazo → redistribuir faltante
        const faltanteMes = this.cuota - monto;
        const nuevosMeses = Math.max(this.meses - 1, 1);
        const adicionalPorMes = Math.round(faltanteMes / nuevosMeses);

        await this.objetivoApi.aportarAObjetivo(this.objetivo.id, {
          monto,
          estrategia: 'mantener_plazo',
          recuperarEnMeses: nuevosMeses,
          redistribucion: adicionalPorMes
        }).toPromise();
      }

      await this.cargarHistorial();
      await this.cargarSaldoDisponible();
      await this.cargarObjetivo(this.objetivo.id);
    }

    // === Aporte normal ===
    else {
      const loading = await this.utilsSvc.loading();
      await loading.present();
      try {
        const res: any = await this.objetivoApi.aportarAObjetivo(this.objetivo.id, {
          monto,
          estrategia: 'mantener_plazo',
        }).toPromise();

        // 🧭 Si el backend marca un reajuste pendiente
        if (res?.plan?.reajustePendiente) {
          const decision = await this.utilsSvc.presentConfirmSheet({
            title: 'Revisión del plan',
            message: `
              No alcanzaste el aporte recomendado el mes anterior.
              ¿Quieres redistribuir el faltante en los meses restantes o extender el plazo?
            `,
            confirmText: 'Redistribuir',
            cancelText: 'Extender plazo',
            color: 'tertiary',
            icon: 'time-outline',
          });

          if (decision) {
            await this.objetivoApi.aportarAObjetivo(this.objetivo.id, {
              monto: 0,
              estrategia: 'mantener_plazo'
            }).toPromise();
          } else {
            const modalExt = await this.modalCtrl.create({
              component: GenericModalComponent,
              cssClass: 'modal-ajustar-plazo',
              componentProps: {
                title: 'Extender plazo',
                color: 'tertiary',
                confirmText: 'Guardar',
                cancelText: 'Cancelar',
                fields: [
                  {
                    name: 'nuevosMeses',
                    label: 'Nuevo número de meses',
                    type: 'number',
                    required: true,
                    default: this.meses || '',
                  },
                ],
              },
            });
            await modalExt.present();
            const { data: dataExt, role: roleExt } = await modalExt.onWillDismiss();
            if (roleExt === 'confirm' && dataExt?.nuevosMeses) {
              await this.objetivoApi.aportarAObjetivo(this.objetivo.id, {
                monto: 0,
                estrategia: 'ajustar_plazo',
                recuperarEnMeses: Number(dataExt.nuevosMeses),
              }).toPromise();
            }
          }
        }

        await this.cargarHistorial();
        await this.cargarSaldoDisponible();
        await this.cargarObjetivo(this.objetivo.id);

        this.utilsSvc.presentToast({
          message: 'Aporte registrado y descontado del saldo 💰',
          color: 'success',
          duration: 1800
        });
      } catch (e) {
        console.error(e);
        this.utilsSvc.presentToast({
          message: 'Error al registrar el aporte',
          color: 'danger',
          duration: 2000
        });
      } finally {
        loading.dismiss();
      }
    }
  }

  async editarAporte(item: any) {
    const modal = await this.modalCtrl.create({
      component: GenericModalComponent,
      cssClass: 'modal-editar-aporte',
      componentProps: {
        title: 'Editar aporte',
        color: 'primary',
        confirmText: 'Guardar',
        cancelText: 'Cancelar',
        fields: [{ name: 'monto', label: 'Monto (CLP)', type: 'number', required: true, default: item?.monto }],
      },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role !== 'confirm' || !data) return;

    const monto = Number(data.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      this.utilsSvc.presentToast({ message: 'Monto inválido', color: 'warning', duration: 1600 });
      return;
    }

    const loading = await this.utilsSvc.loading();
    await loading.present();
    try {
      await this.movimientosApi.actualizarMovimiento(item.id, { monto }).toPromise();
      await this.cargarHistorial();
      await this.objetivoApi.recalcularPlanObjetivo(this.objetivo.id).toPromise();
      await this.cargarObjetivo(this.objetivo.id); // refresca datos en pantalla

      this.utilsSvc.presentToast({ message: 'Aporte actualizado', color: 'success', duration: 1600 });
    } catch {
      this.utilsSvc.presentToast({ message: 'Error al actualizar', color: 'danger', duration: 2000 });
    } finally {
      loading.dismiss();
    }
  }

  async eliminarAporte(item: any) {
    const confirmed = await this.utilsSvc.presentConfirmSheet({
      title: 'Eliminar aporte',
      message: `¿Seguro que deseas eliminar el aporte de <b>CLP ${new Intl.NumberFormat('es-CL').format(item?.monto || 0)}</b>?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      color: 'danger',
      icon: 'trash-outline',
    });
    if (!confirmed) return;

    const loading = await this.utilsSvc.loading();
    await loading.present();
    try {
      await this.movimientosApi.eliminarMovimiento(item.id, 'ahorro').toPromise();
      await this.cargarHistorial();
      await this.objetivoApi.recalcularPlanObjetivo(this.objetivo.id).toPromise();
      await this.cargarObjetivo(this.objetivo.id);

      this.utilsSvc.presentToast({ message: 'Aporte eliminado', color: 'success', duration: 1600 });
    } catch {
      this.utilsSvc.presentToast({ message: 'Error al eliminar aporte', color: 'danger', duration: 2000 });
    } finally {
      loading.dismiss();
    }
  }

  private obtenerNombreUsuario(): string {
    const profile = JSON.parse(localStorage.getItem('userProfile') || 'null');
    if (profile?.name) return profile.name;
    if (profile?.displayName) return profile.displayName;
    if (profile?.email) return String(profile.email).split('@')[0];
    return '';
  }
}
