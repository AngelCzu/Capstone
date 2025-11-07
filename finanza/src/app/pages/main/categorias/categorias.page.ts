import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { UserApi } from 'src/app/services/apis/user.api';
import { Utils } from 'src/app/services/utils';
import { GenericModalComponent } from 'src/app/shared/component/modal-generic/modal-generic.component';
import { SharedModule } from 'src/app/shared/shared-module';


@Component({
  selector: 'app-categorias',
  templateUrl: './categorias.page.html',
  styleUrls: ['./categorias.page.scss'],
  imports: [SharedModule],
  encapsulation: ViewEncapsulation.None,
  
})
export class CategoriasPage implements OnInit {
  private fb = inject(FormBuilder);
  utilsSvc = inject(Utils);
  userApi = inject(UserApi);
  modalCtrl = inject(ModalController);

  categorias: any[] = [];
  categoriasFiltradas: any[] = [];
  tipoSeleccionado: 'movimiento' | 'objetivo' = 'movimiento'; // valor inicial
  formTipo!: FormGroup;
  // Listado de categorías de gasto
  categoriasGasto: any[] = [];



  // 🎨 Paleta base para mostrar en modal
  ionicColorsExtended = [
  // PRIMARY (azul Ionic)
  { name: 'primary', value: '#3880ff' },
  { name: 'primary-shade', value: '#3171e0' },
  { name: 'primary-tint', value: '#4c8dff' },

  // SECONDARY (morado claro)
  { name: 'secondary', value: '#5260ff' },
  { name: 'secondary-shade', value: '#4854e0' },
  { name: 'secondary-tint', value: '#6370ff' },

  // TERTIARY (turquesa)
  { name: 'tertiary', value: '#2dd36f' },
  { name: 'tertiary-shade', value: '#28ba62' },
  { name: 'tertiary-tint', value: '#42d77d' },

  // SUCCESS (verde)
  { name: 'success', value: '#10dc60' },
  { name: 'success-shade', value: '#0ec254' },
  { name: 'success-tint', value: '#28e070' },

  // WARNING (amarillo)
  { name: 'warning', value: '#ffce00' },
  { name: 'warning-shade', value: '#e0b500' },
  { name: 'warning-tint', value: '#ffd31a' },

  // DANGER (rojo)
  { name: 'danger', value: '#f04141' },
  { name: 'danger-shade', value: '#d33939' },
  { name: 'danger-tint', value: '#f25454' },

  // MEDIUM (gris neutro)
  { name: 'medium', value: '#92949c' },
  { name: 'medium-shade', value: '#808289' },
  { name: 'medium-tint', value: '#9d9fa6' }
  ];

  
  
  async ngOnInit() {
    this.formTipo = this.fb.group({
    tipo: ['movimiento']
  });
  await this.cargarCategorias();
  }

  async onRefresh(event: RefresherCustomEvent) {
    try {
      await this.cargarCategorias();
    } finally {
      try { event.target.complete(); } catch {}
    }
  }

  // ========= Cargar todas las categorías =========
  async cargarCategorias() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    this.userApi.obtenerTodasCategorias().subscribe({
      next: (res) => {
        loading.dismiss();

        if (res.ok) {
          this.categorias = res.categorias || [];
          this.filtrarPorTipo(this.tipoSeleccionado);
        } else {
          this.utilsSvc.presentToast({
            message: 'Error al cargar las categorías',
            color: 'danger',
            duration: 2500,
          });
        }
      },
      error: () => {
        loading.dismiss();
        this.utilsSvc.presentToast({
          message: 'Error al cargar las categorías',
          color: 'danger',
          duration: 2500,
        });
      },
    });
  }

  // ========= Filtrar por tipo =========
  filtrarPorTipo(tipo: 'movimiento' | 'objetivo') {
    this.tipoSeleccionado = tipo;
    this.categoriasFiltradas = this.categorias.filter((c) => c.tipo === tipo);
  }

  // ========= Abrir modal de edición =========
  async editarCategoria(cat: any) {
    const usados = this.categorias
      .filter(c => c.id !== cat.id)
      .map(c => c.color);

    // ✅ Creamos un modal clásico (no sheet) con nuestra estética personalizada
    const modal = await this.modalCtrl.create({
      component: GenericModalComponent,
      componentProps: {
        title: 'Editar categoría',
        message: 'Puedes cambiar el nombre, ícono y color.',
        fields: [
          {
            name: 'nombre',
            label: 'Nombre de categoría',
            type: 'text',
            required: true,
            default: cat.nombre,
          },
          {
            name: 'icono',
            label: 'Ícono (emoji)',
            type: 'text',
            required: true,
            default: cat.icono,
          },
          {
            name: 'color',
            label: 'Color de categoría',
            type: 'color',
            required: true,
            default: cat.color,
            options: usados,
          },
        ],
        confirmText: 'Guardar cambios',
        cancelText: 'Cancelar',
        color: 'primary',
      },
      cssClass: 'modal-editar-categoria', // clase con tu SCSS dark blur
      backdropDismiss: true,
      showBackdrop: true,
      animated: true,
      mode: 'ios',
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    // ✅ Si el usuario guardó, actualizamos la categoría
    if (data && role !== 'cancel') {
      await this.actualizarCategoria(cat.id, data);
    }
  }


  // ========= Actualizar categoría =========
  async actualizarCategoria(id: string, nuevosDatos: any) {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    this.userApi.actualizarCategoria(id, nuevosDatos).subscribe({
      next: (res) => {
        loading.dismiss();

        if (res.ok) {
          
          // 🔹 Solo si el backend confirma éxito:
          // Actualizamos la categoría en memoria local
          this.categorias = this.categorias.map(cat =>
            cat.id === id ? { ...cat, ...nuevosDatos } : cat
          );

          // 🔹 Guardamos en localStorage (solo tras éxito real)
          localStorage.setItem('userCategorias', JSON.stringify(this.categorias));

          // 🔹 Refrescamos la vista actual
          this.filtrarPorTipo(this.tipoSeleccionado);

          this.utilsSvc.presentToast({
            message: 'Categoría actualizada correctamente',
            color: 'success',
            duration: 2000,
          });

          this.cargarCategorias();
        } else {
          this.utilsSvc.presentToast({
            message: res.mensaje || 'No se pudo actualizar la categoría',
            color: 'danger',
            duration: 2500,
          });
        }
      },
      error: () => {
        loading.dismiss();
        this.utilsSvc.presentToast({
          message: 'Error al actualizar la categoría',
          color: 'danger',
          duration: 2500,
        });
      },
    });
  }



// ==================== AGREGAR NUEVA CATEGORÍA ====================
async agregarCategoria(tipoCategoria: 'movimiento' | 'objetivo' = 'movimiento'): Promise<void> {
  try {
    // 🔹 Evita colores repetidos según el tipo
    const coloresUsados = this.categorias.map(c => c.color);

    // 🔹 Abrir modal genérico usando tu utilitario (sin modificarlo)
    // ✅ Modal normal (Inline Modal)
    const modal = await this.modalCtrl.create({
      component: GenericModalComponent,
      componentProps: {
        title: `Agregar categoría de ${tipoCategoria === 'movimiento' ? 'Movimiento' : 'Objetivo'}`,
        message:
          tipoCategoria === 'movimiento'
            ? 'Crea una categoría para tus gastos o ingresos.'
            : 'Crea una categoría para tus metas u objetivos.',
        fields: [
          { name: 'nombre', label: 'Nombre de categoría', type: 'text', required: true },
          { name: 'icono', label: 'Icono (emoji)', type: 'text', required: true },
          { name: 'color', label: 'Color de categoría', type: 'color', required: true, options: coloresUsados }
        ],
        confirmText: 'Guardar categoría',
        cancelText: 'Cancelar',
        color: tipoCategoria === 'movimiento' ? 'success' : 'primary'
      },
      cssClass: 'modal-generic', // 👈 misma clase de estilo
      backdropDismiss: true,
      showBackdrop: true,
      animated: true,
      mode: 'ios'
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (!data || role === 'cancel') return;


    // 🧱 Crear nueva categoría
    const nuevaCategoria = {
      ...data,
      tipo: tipoCategoria,
      createdAt: new Date().toISOString()
    };

    // 1️⃣ Guardar en backend
    const res: any = await firstValueFrom(this.userApi.agregarCategoria(nuevaCategoria));
    if (!res.ok) throw new Error('No se pudo guardar en Firestore');

    // 2️⃣ Actualizar en memoria
    this.categorias.push({ ...nuevaCategoria, id: res.id });
    localStorage.setItem('userCategorias', JSON.stringify(this.categorias));

    // 3️⃣ Refrescar filtro
    this.filtrarPorTipo(this.tipoSeleccionado);

    // 4️⃣ Confirmación visual
    this.utilsSvc.presentToast({
      message: `Categoría de ${tipoCategoria} agregada correctamente.`,
      color: 'success',
      duration: 1500
    });

  } catch (err) {
    console.error('❌ Error al guardar categoría:', err);
    this.utilsSvc.presentToast({
      message: 'Error al guardar categoría',
      color: 'danger',
      duration: 2000
    });
  }
}


async eliminarCategoria(cat: any) {
  const confirmado = await this.utilsSvc.presentConfirmSheet({
    title: 'Eliminar categoría',
    message: `¿Seguro que deseas eliminar la categoría "${cat.nombre}"?`,
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    color: 'danger',
    icon: 'trash-outline',
  });

  if (!confirmado) return; // usuario canceló

  try {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    const res: any = await firstValueFrom(this.userApi.eliminarCategoria(cat.id));
    await loading.dismiss();

    if (!res.ok) throw new Error(res.message || 'No se pudo eliminar la categoría');

    // 🔹 Eliminar de memoria y localStorage
    this.categorias = this.categorias.filter(c => c.id !== cat.id);
    localStorage.setItem('userCategorias', JSON.stringify(this.categorias));

    // 🔹 Actualizar la vista actual
    this.filtrarPorTipo(this.tipoSeleccionado);

    // 🔹 Toast de éxito
    this.utilsSvc.presentToast({
      message: `Categoría "${cat.nombre}" eliminada correctamente.`,
      color: 'success',
      duration: 1800,
    });
  } catch (err) {
    console.error('❌ Error al eliminar categoría:', err);
    this.utilsSvc.presentToast({
      message: 'Error al eliminar la categoría',
      color: 'danger',
      duration: 2000,
    });
  }
}



}
