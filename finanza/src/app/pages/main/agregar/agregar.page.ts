import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from 'src/app/shared/shared-module';
import { HttpClient } from '@angular/common/http';
import { Utils } from 'src/app/services/utils';

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.page.html',
  styleUrls: ['./agregar.page.scss'],
  standalone: true,
  imports: [SharedModule, CommonModule, FormsModule, IonicModule],
})
export class AgregarPage {
  // Selector
  tipoSeleccionado = 'ingreso';

  // Modelos para cada formulario
  ingreso = { nombre: '', monto: null as number | null };
  gasto = { nombre: '', monto: null as number | null };
  deuda = {
    nombre: '',
    monto: null as number | null,
    cuotas: null as number | null,
    compartido: false,
    participantes: [] as Array<{ nombre: string; porcentaje: number }>
  };
  objetivo = {
    nombre: '',
    monto: null as number | null,
    tiempo: null as number | null,
    compartido: false,
    participantes: [] as Array<{ nombre: string; porcentaje: number }>
  };

  // Campos temporales para el input de nuevo participante
  nuevoNombreDeuda = '';
  nuevoNombreObjetivo = '';

  // Nombre real del usuario actual
  public currentUserName: string = 'Usuario';

  constructor(private http: HttpClient, private utilsSvc: Utils) {
    this.loadUserName();
  }

  // ==================== Obtener nombre real del usuario ====================
  async loadUserName() {
    try {
      const res: any = await this.http.get('/api/v1/users/me').toPromise();
      if (res?.name && res?.lastName) {
        this.currentUserName = `${res.name}`;
      } else {
        this.currentUserName = res?.name || 'Usuario';
      }
    } catch (e) {
      console.error('No se pudo cargar el nombre del usuario', e);
      this.currentUserName = 'Usuario';
    }
  }

  // ====================== INGRESO ======================
  async guardarIngreso(form?: NgForm) {
    if (form && !form.form.valid) {
      alert('Completa Nombre y Monto para el ingreso.');
      return;
    }
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      await this.http.post('/api/v1/users/me/ingresos', this.ingreso).toPromise();
      this.utilsSvc.presentToast({ message: 'Ingreso guardado', color: 'success', duration: 2000 });
      form?.resetForm();
      this.ingreso = { nombre: '', monto: null };
    } catch (err) {
      this.utilsSvc.presentToast({ message: 'Error al guardar ingreso', color: 'danger', duration: 2000 });
    } finally {
      loading.dismiss();
    }
  }

  // ======================= GASTO =======================
  async guardarGasto(form?: NgForm) {
    if (form && !form.form.valid) {
      alert('Completa Nombre y Monto para el gasto.');
      return;
    }
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      await this.http.post('/api/v1/users/me/gastos', this.gasto).toPromise();
      this.utilsSvc.presentToast({ message: 'Gasto guardado', color: 'danger', duration: 2000 });
      form?.resetForm();
      this.gasto = { nombre: '', monto: null };
    } catch (err) {
      this.utilsSvc.presentToast({ message: 'Error al guardar gasto', color: 'danger', duration: 2000 });
    } finally {
      loading.dismiss();
    }
  }

  // ======================= DEUDA =======================
  async guardarDeuda(form?: NgForm) {
    if (form && !form.form.valid) {
      alert('Completa Nombre y Monto para la deuda.');
      return;
    }
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      await this.http.post('/api/v1/users/me/deudas', this.deuda).toPromise();
      this.utilsSvc.presentToast({ message: 'Deuda guardada', color: 'warning', duration: 2000 });
      form?.resetForm();
      this.deuda = { nombre: '', monto: null, cuotas: null, compartido: false, participantes: [] };
    } catch (err) {
      this.utilsSvc.presentToast({ message: 'Error al guardar deuda', color: 'danger', duration: 2000 });
    } finally {
      loading.dismiss();
    }
  }

  // ====================== OBJETIVO =====================
  async guardarObjetivo(form?: NgForm) {
    if (form && !form.form.valid) {
      alert('Completa Nombre y Monto para el objetivo.');
      return;
    }
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      await this.http.post('/api/v1/users/me/objetivos', this.objetivo).toPromise();
      this.utilsSvc.presentToast({ message: 'Objetivo guardado', color: 'tertiary', duration: 2000 });
      form?.resetForm();
      this.objetivo = { nombre: '', monto: null, tiempo: null, compartido: false, participantes: [] };
    } catch (err) {
      this.utilsSvc.presentToast({ message: 'Error al guardar objetivo', color: 'danger', duration: 2000 });
    } finally {
      loading.dismiss();
    }
  }

  // =================== Helpers ===================
  private ensureCurrentUserFirst(list: Array<{ nombre: string; porcentaje: number }>) {
    const me = this.currentUserName;
    const idx = list.findIndex(p => p.nombre === me);
    if (idx === 0) return;
    if (idx > 0) {
      const [item] = list.splice(idx, 1);
      list.unshift(item);
      return;
    }
    list.unshift({ nombre: me, porcentaje: 0 });
    this.distribuirIgual(list);
  }

  deudaCompartidoChanged() {
    if (this.deuda.compartido) {
      this.ensureCurrentUserFirst(this.deuda.participantes);
      if (this.deuda.participantes.length === 0) {
        this.ensureCurrentUserFirst(this.deuda.participantes);
      }
      this.distribuirIgual(this.deuda.participantes);
    }
  }

  objetivoCompartidoChanged() {
    if (this.objetivo.compartido) {
      this.ensureCurrentUserFirst(this.objetivo.participantes);
      if (this.objetivo.participantes.length === 0) {
        this.ensureCurrentUserFirst(this.objetivo.participantes);
      }
      this.distribuirIgual(this.objetivo.participantes);
    }
  }

  agregarParticipanteDeuda() {
    const name = (this.nuevoNombreDeuda || '').trim();
    if (!name) return;
    const exists = this.deuda.participantes.find(p => p.nombre === name);
    if (!exists) {
      this.deuda.participantes.push({ nombre: name, porcentaje: 0 });
    }
    this.nuevoNombreDeuda = '';
    this.ensureCurrentUserFirst(this.deuda.participantes);
    this.distribuirIgual(this.deuda.participantes);
  }

  porcentajeCambiadoDeuda(index: number, raw: any) {
    const val = Number(raw);
    const list = this.deuda.participantes;
    if (!list || index < 0 || index >= list.length) return;
    this.ajustarPorcentaje(list, list[index], isNaN(val) ? 0 : val);
  }

  eliminarParticipanteDeuda(index: number) {
    const list = this.deuda.participantes;
    if (!list || index < 0 || index >= list.length) return;
    if (list[index].nombre === this.currentUserName) {
      console.warn('No se puede eliminar al usuario logueado.');
      return;
    }
    list.splice(index, 1);
    if (this.deuda.participantes.length) {
      this.ensureCurrentUserFirst(this.deuda.participantes);
      this.distribuirIgual(this.deuda.participantes);
    }
  }

  agregarParticipanteObjetivo() {
    const name = (this.nuevoNombreObjetivo || '').trim();
    if (!name) return;
    const exists = this.objetivo.participantes.find(p => p.nombre === name);
    if (!exists) {
      this.objetivo.participantes.push({ nombre: name, porcentaje: 0 });
    }
    this.nuevoNombreObjetivo = '';
    this.ensureCurrentUserFirst(this.objetivo.participantes);
    this.distribuirIgual(this.objetivo.participantes);
  }

  porcentajeCambiadoObjetivo(index: number, raw: any) {
    const val = Number(raw);
    const list = this.objetivo.participantes;
    if (!list || index < 0 || index >= list.length) return;
    this.ajustarPorcentaje(list, list[index], isNaN(val) ? 0 : val);
  }

  eliminarParticipanteObjetivo(index: number) {
    const list = this.objetivo.participantes;
    if (!list || index < 0 || index >= list.length) return;
    if (list[index].nombre === this.currentUserName) {
      console.warn('No se puede eliminar al usuario logueado.');
      return;
    }
    list.splice(index, 1);
    if (this.objetivo.participantes.length) {
      this.ensureCurrentUserFirst(this.objetivo.participantes);
      this.distribuirIgual(this.objetivo.participantes);
    }
  }

  private roundTwo(n: number) {
    return Math.round(n * 100) / 100;
  }

  totalPorcentaje(list: Array<{ nombre: string; porcentaje: number }>) {
    return this.roundTwo(list.reduce((s, p) => s + (p.porcentaje || 0), 0));
  }

  private distribuirIgual(list: Array<{ nombre: string; porcentaje: number }>) {
    const n = list.length;
    if (n === 0) return;
    const base = this.roundTwo(100 / n);
    list.forEach(p => p.porcentaje = base);
    const sum = this.totalPorcentaje(list);
    const diff = this.roundTwo(100 - sum);
    if (Math.abs(diff) > 0 && list.length) {
      list[0].porcentaje = this.roundTwo(list[0].porcentaje + diff);
    }
  }

  private ajustarPorcentaje(
    list: Array<{ nombre: string; porcentaje: number }>,
    changed: { nombre: string; porcentaje: number },
    newValue: number
  ) {
    if (!list || list.length === 0) return;
    let v = Math.max(0, Math.min(100, this.roundTwo(newValue)));
    const others = list.filter(p => p !== changed);
    if (others.length === 0) {
      changed.porcentaje = 100;
      return;
    }
    changed.porcentaje = v;
    const remainder = this.roundTwo(100 - v);
    const perOther = this.roundTwo(remainder / others.length);
    others.forEach(o => o.porcentaje = perOther);
    const sum = this.totalPorcentaje(list);
    const diff = this.roundTwo(100 - sum);
    if (Math.abs(diff) > 0) {
      if (others.length) {
        others[0].porcentaje = this.roundTwo(others[0].porcentaje + diff);
      } else {
        changed.porcentaje = this.roundTwo(changed.porcentaje + diff);
      }
    }
  }
}
