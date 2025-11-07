import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-test',
  templateUrl: './test.page.html',
  styleUrls: ['./test.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedModule]
})
export class TestPage {
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

  // Exponer nombre del usuario actual para la plantilla
  public currentUserName: string;

  constructor() {
    this.currentUserName = this.getCurrentUserName();
  }

  onRefresh(event: RefresherCustomEvent) {
    try { event.target.complete(); } catch {}
  }

  // Handlers mínimos (reemplazar con lógica real)
  guardarIngreso(form?: NgForm) {
    if (form && !form.form.valid) { alert('Completa Nombre y Monto para el ingreso.'); return; }
    console.log('Ingreso guardado', this.ingreso);
  }
  guardarGasto(form?: NgForm) {
    if (form && !form.form.valid) { alert('Completa Nombre y Monto para el gasto.'); return; }
    console.log('Gasto guardado', this.gasto);
  }
  guardarDeuda(form?: NgForm) {
    if (form && !form.form.valid) { alert('Completa Nombre y Monto para la deuda.'); return; }
    console.log('Deuda guardada', this.deuda);
  }
  guardarObjetivo(form?: NgForm) {
    if (form && !form.form.valid) { alert('Completa Nombre y Monto para el objetivo.'); return; }
    console.log('Objetivo guardado', this.objetivo);
  }

  // Obtener nombre del usuario logueado (ajusta a tu fuente real)
  private getCurrentUserName(): string {
    // ejemplo: tomar de localStorage si tu app lo guarda ahí; cambia según tu auth
    return (localStorage.getItem('currentUserName') || 'Usuario') as string;
  }

  // Asegura que el usuario actual esté en primera posición
  private ensureCurrentUserFirst(list: Array<{ nombre: string; porcentaje: number }>) {
    const me = this.getCurrentUserName();
    const idx = list.findIndex(p => p.nombre === me);
    if (idx === 0) return; // ya primero
    if (idx > 0) {
      // mover a primera posición
      const [item] = list.splice(idx, 1);
      list.unshift(item);
      return;
    }
    // no existe => añadir al inicio y redistribuir
    list.unshift({ nombre: me, porcentaje: 0 });
    this.distribuirIgual(list);
  }

  // Llamadas cuando se activa/desactiva compartido
  deudaCompartidoChanged() {
    if (this.deuda.compartido) {
      // forzar usuario actual primero
      this.ensureCurrentUserFirst(this.deuda.participantes);
      if (this.deuda.participantes.length === 0) {
        // si no había participantes, crear con el usuario actual
        this.ensureCurrentUserFirst(this.deuda.participantes);
      }
      // asegurar distribución válida
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

  // --- DEUDA ---
  agregarParticipanteDeuda() {
    const name = (this.nuevoNombreDeuda || '').trim();
    if (!name) return;
    // evitar duplicados; si existe, moverlo después del usuario actual
    const exists = this.deuda.participantes.find(p => p.nombre === name);
    if (exists) {
      // mover al final (o dejar donde esté)
    } else {
      this.deuda.participantes.push({ nombre: name, porcentaje: 0 });
    }
    this.nuevoNombreDeuda = '';
    this.ensureCurrentUserFirst(this.deuda.participantes);
    this.distribuirIgual(this.deuda.participantes);
  }

  // ahora recibe índice y valor
  porcentajeCambiadoDeuda(index: number, raw: any) {
    const val = Number(raw);
    const list = this.deuda.participantes;
    if (!list || index < 0 || index >= list.length) return;
    this.ajustarPorcentaje(list, list[index], isNaN(val) ? 0 : val);
  }

  eliminarParticipanteDeuda(index: number) {
    const list = this.deuda.participantes;
    if (!list || index < 0 || index >= list.length) return;
    // proteger usuario actual
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

  // --- OBJETIVO ---
  agregarParticipanteObjetivo() {
    const name = (this.nuevoNombreObjetivo || '').trim();
    if (!name) return;
    const exists = this.objetivo.participantes.find(p => p.nombre === name);
    if (exists) {
      // mover al final (o dejar donde esté)
    } else {
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
    // proteger usuario actual
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

  // Utilidades generales
  private roundTwo(n: number) {
    return Math.round(n * 100) / 100;
  }

  totalPorcentaje(list: Array<{ nombre: string; porcentaje: number }>) {
    return this.roundTwo(list.reduce((s, p) => s + (p.porcentaje || 0), 0));
  }

  // Distribuye 100% en partes iguales (corrige redondeo)
  private distribuirIgual(list: Array<{ nombre: string; porcentaje: number }>) {
    const n = list.length;
    if (n === 0) return;
    const base = this.roundTwo(100 / n);
    list.forEach(p => p.porcentaje = base);
    // corregir diferencia por redondeo
    const sum = this.totalPorcentaje(list);
    const diff = this.roundTwo(100 - sum);
    if (Math.abs(diff) > 0 && list.length) {
      list[0].porcentaje = this.roundTwo(list[0].porcentaje + diff);
    }
  }

  // Ajusta porcentajes cuando un participante cambia; reparte el resto igualmente entre los otros
  private ajustarPorcentaje(list: Array<{ nombre: string; porcentaje: number }>, changed: { nombre: string; porcentaje: number }, newValue: number) {
    if (!list || list.length === 0) return;
    // clamp newValue
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
    // corregir suma por redondeo
    const sum = this.totalPorcentaje(list);
    const diff = this.roundTwo(100 - sum);
    if (Math.abs(diff) > 0) {
      // aplicar corrección al primer otro participante si existe, sino al cambiado
      if (others.length) {
        others[0].porcentaje = this.roundTwo(others[0].porcentaje + diff);
      } else {
        changed.porcentaje = this.roundTwo(changed.porcentaje + diff);
      }
    }
  }
}
