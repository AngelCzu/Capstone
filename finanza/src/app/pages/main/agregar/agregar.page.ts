import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from 'src/app/shared/shared-module';

import { Utils } from 'src/app/services/utils';
import { Firebase } from 'src/app/services/firebase';
import { User } from 'src/app/models/user.model';
import { UserApi } from 'src/app/services/apis/user.api';
import { firstValueFrom } from 'rxjs';
import { MovimientosApi } from 'src/app/services/apis/movimientos.api';

// ======================================================
// =============== DECORADOR E INYECCIONES ===============
// ======================================================

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.page.html',
  styleUrls: ['./agregar.page.scss'],
  imports: [SharedModule, CommonModule, FormsModule, IonicModule],
})
export class AgregarPage {

  // Inyecciones
  utilsSvc = inject(Utils);
  firebaseSvc = inject(Firebase);
  userApi = inject(UserApi);
  movApi = inject(MovimientosApi);






// ======================================================
// ===================== FORMULARIOS =====================
// ======================================================
  formIngreso = new FormGroup({
    origen: new FormControl('', [Validators.required]),
    monto: new FormControl(null, [Validators.required,Validators.pattern(/^[1-9]\d*$/),  Validators.min(1)]),
  });

  formGasto = new FormGroup({
    origen: new FormControl('', [Validators.required]),
    monto: new FormControl(null, [Validators.required, Validators.pattern(/^[1-9]\d*$/), Validators.min(1)]),
    moneda: new FormControl('CLP', [Validators.required]),  // CLP o UF
    montoUF: new FormControl(null),                         // solo si moneda = UF
    valorUF: new FormControl(null),                         // valor de referencia UF
    categoria: new FormControl('', [Validators.required]),
    frecuencia: new FormControl('unica', [Validators.required]),
    compartido: new FormControl(false),
    modoDivision: new FormControl('porcentaje'), // porcentaje o clp
    participantes: new FormArray([]),
  });

  formDeuda = new FormGroup({
    origen: new FormControl('', [Validators.required]),
    monto: new FormControl(null, [Validators.required, Validators.pattern(/^[1-9]\d*$/), Validators.min(1)]),
    moneda: new FormControl('CLP', [Validators.required]),  // CLP o UF
    montoUF: new FormControl(null),
    valorUF: new FormControl(null),
    cuotas: new FormControl(null),
    fechaPago: new FormControl(null),
    compartido: new FormControl(false),
    modoDivision: new FormControl('porcentaje'),
    participantes: new FormArray([]),
  });

  formObjetivo = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    monto: new FormControl(null, [Validators.required, Validators.pattern(/^[1-9]\d*$/), Validators.min(1)]),
    moneda: new FormControl('CLP', [Validators.required]),  // CLP o UF
    montoUF: new FormControl(null),
    valorUF: new FormControl(null),
    tiempo: new FormControl(null),
    compartido: new FormControl(false),
    participantes: new FormArray([]),
    modoDivision: new FormControl('porcentaje'),
    categoria: new FormControl('', [Validators.required]),
  });


  nuevoParticipanteGasto = new FormControl('');
  nuevoParticipanteDeuda = new FormControl('');
  nuevoParticipanteObjetivo = new FormControl('');



// ======================================================
// ================== VARIABLES GLOBALES =================
// ======================================================
  // Tipo de formulario seleccionado
  tipoSeleccionado = new FormControl('ingreso');

  // Obtener al usuario
  currentUser: User | null = null;
  public currentUserName: string = 'Usuario';

  // Imagen asignada al objetivo según categoría
  imagenAsignada: string | null = null;

  // Listado de categorías de gasto
  categoriasGasto: any[] = [];
  categoriasObjetivo: any[] = [];


// ======================================================
// =================== CICLO DE VIDA =====================
// ======================================================

  constructor() { }

  ngOnInit() {
    this.getUserProfile();
    this.cargarCategorias();
  }

  



// ======================================================
// =================== FUNCIONES DE DATOS ================
// ======================================================

// Obtener perfil del usuario actual
getUserProfile() {
  try {
    const storedUser = localStorage.getItem('userData');

    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.currentUser = user;
      this.currentUserName = `${user.name || ''} ${user.lastName || ''}`.trim();
    } else {
      // Si no hay datos locales, hacer fallback al backend
      this.userApi.getMe().subscribe({
        next: (res) => {
          this.currentUser = res;
          this.currentUserName = `${res.name} ${res.lastName}`;
          localStorage.setItem('userData', JSON.stringify(res));
        },
        error: (err) => {
          console.error('Error al obtener perfil:', err);
          this.currentUser = null;
        }
      });
    }
  } catch (err) {
    console.error('❌ Error al cargar perfil local:', err);
    this.currentUser = null;
  }
}

// Cargar categorías de gasto
async cargarCategorias() {
  try {
    const storedCats = localStorage.getItem('userCategorias');

    if (storedCats) {
      const categorias = JSON.parse(storedCats);

      // ✅ Separar automáticamente según tipo
      this.categoriasGasto = categorias.filter((cat: any) => cat.tipo === 'movimiento');
      this.categoriasObjetivo = categorias.filter((cat: any) => cat.tipo === 'objetivo');

      console.log('📦 Categorías cargadas desde localStorage:');
      console.log('➡️ Gastos:', this.categoriasGasto);
      console.log('➡️ Objetivos:', this.categoriasObjetivo);
      return;
    }

    // 🔁 Si no hay categorías guardadas localmente, obtener ambas del backend
    const movRes: any = await firstValueFrom(this.userApi.obtenerCategorias('movimiento'));
    const objRes: any = await firstValueFrom(this.userApi.obtenerCategorias('objetivo'));

    if (movRes.ok && objRes.ok) {
      this.categoriasGasto = movRes.categorias;
      this.categoriasObjetivo = objRes.categorias;

      // 🔹 Guardar todas las categorías combinadas en localStorage
      const todas = [...movRes.categorias, ...objRes.categorias];
      localStorage.setItem('userCategorias', JSON.stringify(todas));

      console.log('🌐 Categorías cargadas desde backend y guardadas localmente');
    }

  } catch (err) {
    console.error('❌ Error cargando categorías:', err);
  }
}



// Obtener valor UF actual (con cache localStorage)
async obtenerValorUF() {
  const cacheKey = 'valorUF_cache';
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const parsed = JSON.parse(cached);
    const hoy = new Date().toISOString().split('T')[0]; // yyyy-mm-dd

    // Si el valor es del mismo día, usar cache
    if (parsed.fecha === hoy) {
      return parsed.valor;
    }
  }

  // Si no hay cache o está desactualizado, consultamos la API
  try {
    const response = await fetch('https://mindicador.cl/api/uf');
    const data = await response.json();
    const valorUF = data.serie[0].valor;

    // Guardar cache del día
    localStorage.setItem(cacheKey, JSON.stringify({
      valor: valorUF,
      fecha: new Date().toISOString().split('T')[0]
    }));

    return valorUF;
  } catch (err) {
    console.error('Error al obtener UF:', err);
    return 37000; // fallback seguro
  }
}

// ======================================================    (no hacen cálculos ni guardan datos, sino que
// ==================== FUNCIONES UI =====================    reaccionan a interacciones visuales del usuario
// ======================================================     o actualizan el estado de los formularios.)

// CAMBIOS EN "MONEDA"
async onCambioMoneda(form: FormGroup) {
const moneda = form.get('moneda')?.value;

if (moneda === 'UF') {
  const valorUF = await this.obtenerValorUF();
  form.patchValue({ valorUF });

  // Si el usuario ya llenó montoUF, calcular previsualización CLP
  const montoUF = form.get('montoUF')?.value;
  if (montoUF) {
    const montoCLP = Math.round(valorUF * montoUF);
    console.log('monto CLP calculado:', montoCLP);
    
    form.patchValue({ monto: montoCLP });
  }
} else {
  // Si vuelve a CLP, limpiar campos UF
  form.patchValue({ montoUF: null, valorUF: null });
}
}

// CAMBIOS EN "COMPARTIDO"
gastoCompartidoChanged() {
  if (this.formGasto.get('compartido')?.value) {
    const list = this.participantesGasto;
    this.ensureCurrentUserFirstFormArray(list);
    this.distribuirIgualFormArray(list);
  } else {
    this.participantesGasto.clear();  // Limpiar los participantes si no es compartido
  }
}

deudaCompartidoChanged() {
  if (this.formDeuda.get('compartido')?.value) {
    const list = this.participantesDeuda;
    this.ensureCurrentUserFirstFormArray(list);
    this.distribuirIgualFormArray(list);
  } else {
    this.participantesDeuda.clear();
  }
}

objetivoCompartidoChanged() {
  if (this.formObjetivo.get('compartido')?.value) {
    const list = this.participantesObjetivo;
    this.ensureCurrentUserFirstFormArray(list);
    this.distribuirIgualFormArray(list);
  } else {
    this.participantesObjetivo.clear();
  }
}



// ======================================================
// ================ FUNCIONES PARTICIPANTES ==============
// ======================================================

async agregarCategoria(tipoCategoria: 'movimiento' | 'objetivo' = 'movimiento') {
  // 🔹 Evita colores repetidos según el tipo
  const coloresUsados =
    tipoCategoria === 'movimiento'
      ? this.categoriasGasto.map(c => c.color)
      : this.categoriasObjetivo.map(c => c.color);

  // 🔹 Abrir modal genérico
  const data = await this.utilsSvc.presentGenericModal({
    title: `Agregar categoría de ${tipoCategoria}`,
    fields: [
      { name: 'nombre', label: 'Nombre de categoría', type: 'text', required: true },
      { name: 'color', label: 'Color de categoría', type: 'color', required: true, options: coloresUsados }
    ],
    confirmText: 'Guardar categoría',
    color: 'success',
    breakpoints: [0.7],
    initialBreakpoint: 0.7
  });

  if (!data) return; // Usuario canceló

  try {
    // 🧱 Crear nueva categoría
    const nuevaCategoria = {
      ...data,
      tipo: tipoCategoria, // 👈 el tipo viene directamente del parámetro
      icono: tipoCategoria === 'movimiento' ? '💸' : '🎯',
      createdAt: new Date().toISOString()
    };

    // 1️⃣ Guardar en backend
    const res: any = await firstValueFrom(this.userApi.agregarCategoria(nuevaCategoria));
    if (!res.ok) throw new Error('No se pudo guardar en Firestore');

    // 2️⃣ Actualizar localStorage
    const stored = localStorage.getItem('userCategorias');
    const categorias = stored ? JSON.parse(stored) : [];
    categorias.push(nuevaCategoria);
    localStorage.setItem('userCategorias', JSON.stringify(categorias));

    // 3️⃣ Actualizar arrays locales
    if (tipoCategoria === 'movimiento') {
      this.categoriasGasto.push(nuevaCategoria);
    } else {
      this.categoriasObjetivo.push(nuevaCategoria);
    }

    // 4️⃣ Confirmar visualmente
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





// Getters
get participantesGasto() { return this.formGasto.get('participantes') as FormArray; }
get participantesDeuda() { return this.formDeuda.get('participantes') as FormArray; }
get participantesObjetivo() { return this.formObjetivo.get('participantes') as FormArray; }

// AGREGAR PARTICIPANTE 
agregarParticipante(formArray: FormArray, inputControl: FormControl) {
  const nombre = inputControl.value?.trim();
  if (!nombre) return;

  const existe = formArray.controls.some(
    c => c.get('nombre')?.value?.toLowerCase() === nombre.toLowerCase()
  );
  if (existe) {
    this.utilsSvc.presentToast({
      message: 'Ese participante ya existe.',
      color: 'warning',
      duration: 1500
    });
    return;
  }

  const nuevo = new FormGroup({
    nombre: new FormControl(nombre),
    porcentaje: new FormControl(0),
    monto: new FormControl(0)
  });

  formArray.push(nuevo);
  inputControl.reset();
  this.recalcularPorcentajes(formArray);
  this.actualizarMontosParticipantes(formArray);
}

// ELIMINAR PARTICIPANTE 
eliminarParticipante(formArray: FormArray, index: number) {
  formArray.removeAt(index);
  this.recalcularPorcentajes(formArray);
  this.actualizarMontosParticipantes(formArray);
}

// ACTUALIZAR PORCENTAJE (genérico)
actualizarPorcentaje(index: number, value: any, formArray: FormArray) {
  const val = parseFloat(value);
  if (isNaN(val) || val < 0 || val > 100) return;

  const participante = formArray.at(index) as FormGroup;
  participante.get('porcentaje')?.setValue(val, { emitEvent: false });
  participante.get('monto')?.setValue(null, { emitEvent: false });

  this.actualizarMontosParticipantes(formArray);
}

// ACTUALIZAR MONTO DIRECTO 
actualizarMonto(index: number, value: any, formArray: FormArray) {
  const val = parseInt(value, 10);
  if (isNaN(val) || val < 0) return;

  const participante = formArray.at(index) as FormGroup;
  participante.get('monto')?.setValue(val, { emitEvent: false });
  participante.get('porcentaje')?.setValue(null, { emitEvent: false });

  this.actualizarMontosParticipantes(formArray);
}

// ACTUALIZAR MONTOS DE TODOS (genérico)
actualizarMontosParticipantes(formArray: FormArray) {
  const form = this.obtenerFormularioPorFormArray(formArray);
  if (!form) return;

  const total =
    form.value.moneda === 'UF'
      ? (form.value.montoUF || 0) * (form.value.valorUF || 0)
      : form.value.monto || 0;

  const modo = form.value.modoDivision;
  const participantes = formArray.controls as FormGroup[];

  if (!total || total <= 0 || participantes.length === 0) return;

  if (modo === 'porcentaje') {
    participantes.forEach(p => {
      const porc = p.get('porcentaje')?.value || 0;
      const montoCalc = Math.round((porc / 100) * total);
      p.get('monto')?.setValue(montoCalc, { emitEvent: false });
    });
  } else if (modo === 'clp') {
    const totalAsignado = participantes.reduce(
      (acc, p) => acc + (p.get('monto')?.value || 0),
      0
    );
    if (totalAsignado > total) {
      this.utilsSvc.presentToast({
        message: '⚠️ El total asignado supera el monto total.',
        color: 'warning',
        duration: 2000
      });
    }
  }
}

// MAPEAR FORMARRAY → FORMULARIO PADRE
obtenerFormularioPorFormArray(formArray: FormArray): FormGroup | null {
  if (formArray === this.participantesGasto) return this.formGasto;
  if (formArray === this.participantesDeuda) return this.formDeuda;
  if (formArray === this.participantesObjetivo) return this.formObjetivo;
  return null;
}





// ======================================================
// =================== GUARDAR DATOS =====================
// ======================================================

// GUARDAR INGRESO
async guardarIngreso() {
  if (this.formIngreso.invalid) return;
  console.log(this.formIngreso.value);
  
   const loading = await this.utilsSvc.loading();
   await loading.present();

   try {
     await firstValueFrom(this.movApi.agregarIngreso(this.formIngreso.value));
      
     this.utilsSvc.presentToast({
       message: 'Ingreso guardado correctamente',
       duration: 2000,
       color: 'success',
       position: 'bottom',
     });
     this.formIngreso.reset();

   } catch (error: any) {
     this.utilsSvc.presentToast({
       message: error.message || 'Error al guardar ingreso',
       duration: 2500,
       color: 'danger',
       position: 'bottom'
     });
   } finally {
     loading.dismiss();
   }
}

// GUARDAR GASTO
async guardarGasto() {
  if (this.formGasto.invalid) return;
  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    const data = this.formGasto.value;

    // ✅ Validación UF
    if (data.moneda === 'UF') {
      if (!data.montoUF || !data.valorUF) {
        throw new Error('Debe ingresar el monto en UF y tener valor UF válido.');
      }
      data.monto = Math.round(data.montoUF * data.valorUF);
    } else {
      data.montoUF = null;
      data.valorUF = null;
    }

    // ===== Actualizamos montos CLP según modo antes de enviar =====
    this.actualizarMontosParticipantes(this.participantesGasto);
    await firstValueFrom(this.movApi.agregarGasto(data));

    this.utilsSvc.presentToast({
      message: 'Gasto guardado correctamente',
      duration: 2000,
      color: 'success',
      position: 'bottom',
    });

    // Reset con valor inicial forzado
    this.formGasto.reset({ compartido: false, moneda: 'CLP', frecuencia: 'unica' });
  } catch (error: any) {
    this.utilsSvc.presentToast({
      message: error.message || 'Error al guardar gasto',
      duration: 2500,
      color: 'danger',
      position: 'bottom',
    });
  } finally {
    loading.dismiss();
  }
}

// GUARDAR DEUDA
async guardarDeuda() {
  if (this.formDeuda.invalid) return;

  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    const data = this.formDeuda.value;

    // ===== Validación UF =====
    if (data.moneda === 'UF') {
      if (!data.montoUF || !data.valorUF) {
        throw new Error('Debe ingresar el monto en UF y tener valor UF válido.');
      }
      data.monto = Math.round(data.montoUF * data.valorUF);
    }

    // ===== Actualizamos montos CLP según modo antes de enviar =====
    this.actualizarMontosParticipantes(this.participantesDeuda);

    // ===== Conversión de porcentajes a CLP (por seguridad) =====
    if (data.modoDivision === 'porcentaje' && data.participantes?.length) {
      const total = data.monto;
      data.participantes = data.participantes.map((p: any) => {
        const montoCLP = Math.round((total * (p.porcentaje || 0)) / 100);
        return { ...p, monto: montoCLP };
      });
    }

    // ===== Enviar datos al backend =====
    await firstValueFrom(this.movApi.agregarDeuda(data));

    // ===== Feedback =====
    this.utilsSvc.presentToast({
      message: 'Deuda guardada correctamente',
      duration: 2000,
      color: 'success',
      position: 'bottom',
    });

    // Limpiar formulario
    this.formDeuda.reset();
    this.participantesDeuda.clear();

  } catch (error: any) {
    this.utilsSvc.presentToast({
      message: error.message || 'Error al guardar la deuda',
      duration: 2500,
      color: 'danger',
      position: 'bottom',
    });
  } finally {
    loading.dismiss();
  }
}

// GUARDAR OBJETIVO
async guardarObjetivo() {
  if (this.formObjetivo.invalid) return;
  const loading = await this.utilsSvc.loading();
  await loading.present();

  try {
    const data = this.formObjetivo.value;

    // ✅ Validación UF
    if (data.moneda === 'UF') {
      if (!data.montoUF || !data.valorUF) {
        throw new Error('Debe ingresar el monto en UF y tener valor UF válido.');
      }
      data.monto = data.montoUF * data.valorUF;
    } else {
      data.montoUF = null;
      data.valorUF = null;
    }

    await firstValueFrom(this.movApi.agregarObjetivo(data));

    this.utilsSvc.presentToast({
      message: 'Objetivo guardado correctamente',
      duration: 2000,
      color: 'success',
      position: 'bottom',
    });
    this.formObjetivo.reset();
    this.participantesObjetivo.clear();
  } catch (error: any) {
    this.utilsSvc.presentToast({
      message: error.message || 'Error al guardar el objetivo',
      duration: 2500,
      color: 'danger',
      position: 'bottom',
    });
  } finally {
    loading.dismiss();
  }
}





// ======================================================
// ================== FUNCIONES AUXILIARES ===============
// ======================================================


// FUNCIONES DE AJUSTE DE PORCENTAJES
private roundTwo(n: number) {
  return Math.round(n * 100) / 100;
}

private ensureCurrentUserFirstFormArray(list: FormArray) {
  const me = this.currentUserName;
  const idx = list.controls.findIndex(c => c.get('nombre')?.value === me);
  if (idx === 0) return;
  if (idx > 0) {
    const ctrl = list.at(idx); 
    list.removeAt(idx);
    list.insert(0, ctrl);
    return;
  }
  const ctrl = new FormGroup({
    nombre: new FormControl(me),
    porcentaje: new FormControl(0),
    monto: new FormControl(0)
  });
  list.insert(0, ctrl);
  this.distribuirIgualFormArray(list);
}

private distribuirIgualFormArray(list: FormArray) {
  const n = list.length;
  if (n === 0) return;
  const base = this.roundTwo(100 / n);
  list.controls.forEach(c => c.get('porcentaje')?.setValue(base));
  const sum = this.totalPorcentajeFormArray(list);
  const diff = this.roundTwo(100 - sum);
  if (Math.abs(diff) > 0 && n > 0) {
    const first = list.at(0);
    const val = first.get('porcentaje')?.value || 0;
    first.get('porcentaje')?.setValue(this.roundTwo(val + diff));
  }
}

private ajustarPorcentajeFormArray(list: FormArray, index: number, newValue: number) {
  const n = list.length;
  if (n === 0) return;
  const changed = list.at(index);
  let v = Math.max(0, Math.min(100, this.roundTwo(newValue)));
  const others = list.controls.filter(c => c !== changed);
  changed.get('porcentaje')?.setValue(v);
  const remainder = this.roundTwo(100 - v);
  const perOther = this.roundTwo(remainder / others.length);
  others.forEach(o => o.get('porcentaje')?.setValue(perOther));
  const sum = this.totalPorcentajeFormArray(list);
  const diff = this.roundTwo(100 - sum);
  if (Math.abs(diff) > 0 && others.length) {
    const first = others[0];
    const val = first.get('porcentaje')?.value || 0;
    first.get('porcentaje')?.setValue(this.roundTwo(val + diff));
  }
}

totalPorcentajeFormArray(list: FormArray) {
  return this.roundTwo(
    list.controls.reduce((s, c) => s + (c.get('porcentaje')?.value || 0), 0)
  );
}

porcentajeCambiadoDeuda(index: number, raw: any) {
  const val = Number(raw);
  if (!isNaN(val)) this.ajustarPorcentajeFormArray(this.participantesDeuda, index, val);
}

porcentajeCambiadoObjetivo(index: number, raw: any) {
  const val = Number(raw);
  if (!isNaN(val)) this.ajustarPorcentajeFormArray(this.participantesObjetivo, index, val);
}


// REPARTO DE PORCENTAJES
recalcularPorcentajes(formArray: FormArray) {
  const total = formArray.length;
  if (total === 0) return;

  const base = Math.floor(100 / total);
  formArray.controls.forEach((ctrl) => ctrl.get('porcentaje')?.setValue(base, { emitEvent: false }));

  const diff = 100 - base * total;
  if (diff !== 0 && total > 0) {
    const first = formArray.at(0);
    const p = first.get('porcentaje')?.value || 0;
    first.get('porcentaje')?.setValue(p + diff);
  }
}


// REPARTIR MONTOS IGUALMENTE
validarTotalParticipantes() {
  const data = this.formDeuda.value;

  // Solo aplica si está compartido y en modo CLP
  if (!data.compartido || data.modoDivision !== 'clp') return null;

  const total = data.monto || 0;
  const totalParticipantes = this.participantesDeuda.controls.reduce((acc, ctrl) => {
    const val = Number(ctrl.get('monto')?.value) || 0;
    return acc + val;
  }, 0);

  // Si la suma supera el total, mostrar error y bloquear guardado
  if (totalParticipantes > total) {
    this.formDeuda.setErrors({ totalExcedido: true });
    this.utilsSvc.presentToast({
      message: `El total repartido (${totalParticipantes.toLocaleString()}) supera el monto total (${total.toLocaleString()}).`,
      color: 'danger',
      duration: 2000,
    });
  } else {
    // limpiar error si vuelve a ser válido
    this.formDeuda.setErrors(null);
  }
}


// REPARTIR MONTOS IGUALMENTE
distribuirMontosIguales() {
  const data = this.formDeuda.value;

  if (!data.compartido || data.modoDivision !== 'clp' || !data.monto) return;

  const total = data.monto;
  const n = this.participantesDeuda.length;
  if (n === 0) return;

  // repartir el monto total entre los participantes
  const base = Math.floor(total / n);
  const resto = total - base * n;

  this.participantesDeuda.controls.forEach((ctrl, i) => {
    let val = base;
    if (i === 0 && resto > 0) val += resto; // ajusta el redondeo
    ctrl.get('monto')?.setValue(val, { emitEvent: false });
  });
}


}