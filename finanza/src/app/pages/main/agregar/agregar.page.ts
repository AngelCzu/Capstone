import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, NgForm, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from 'src/app/shared/shared-module';

import { Utils } from 'src/app/services/utils';
import { Firebase } from 'src/app/services/firebase';
import { User } from 'src/app/models/user.model';
import { UserApi } from 'src/app/services/user.api';
import { firstValueFrom } from 'rxjs';
import { MovimientosApi } from 'src/app/services/movimientos.api';

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.page.html',
  styleUrls: ['./agregar.page.scss'],
  imports: [SharedModule, CommonModule, FormsModule, IonicModule],
})
export class AgregarPage {

  // ============================
  // Inyección de servicios
  // ============================
  utilsSvc = inject(Utils);
  firebaseSvc = inject(Firebase);
  userApi = inject(UserApi)
  movApi = inject(MovimientosApi)

  // Tipo de formulario seleccionado
  tipoSeleccionado = 'ingreso';

  // Obtener al usuario
  currentUser: User | null = null;

  // ============================
  // Formulario Ingreso
  // ============================
  formIngreso = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    monto: new FormControl(null, [Validators.required, Validators.pattern(/^[1-9]\d*$/), Validators.min(1)],)
  });


  // ============================
  // Formulario Gasto
  // ============================
  formGasto = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    monto: new FormControl(null, [Validators.required, Validators.pattern(/^[1-9]\d*$/), Validators.min(1)])
  });


  // ============================
  // Formulario Deuda
  // ============================
  formDeuda = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    monto: new FormControl(null, [Validators.required, Validators.pattern(/^[1-9]\d*$/), Validators.min(1)]),
    cuotas: new FormControl(null),
    compartido: new FormControl(false),
    participantes: new FormArray([])
  });


  // ============================
  // Formulario Objetivo
  // ============================
  formObjetivo = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    monto: new FormControl(null, [Validators.required, Validators.pattern(/^[1-9]\d*$/), Validators.min(1)]),
    tiempo: new FormControl(null),
    compartido: new FormControl(false),
    participantes: new FormArray([])
  });

  // ============================
  // Formulario Participantes
  // ============================
  nuevoParticipanteDeuda = new FormControl('');
  nuevoParticipanteObjetivo = new FormControl('');


  // Nombre real del usuario actual
  public currentUserName: string = 'Usuario';

  constructor() {
    
  }

  ngOnInit() {
    this.getUserProfile();
  }


  getUserProfile() {
    this.userApi.getMe().subscribe({
      next: (res) => {
        this.currentUser = res;
        this.currentUserName = `${res.name} ${res.lastName}`;
        
      },
      error: (err) => {
        console.error('Error al obtener perfil:', err);
        this.currentUser = null;
      }
    });
  }
  
  // ============================
  // GUARDAR INGRESO
  // ============================
  async guardarIngreso() {
    if (this.formIngreso.invalid) return;
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      const uid = this.currentUser.uid
      const path = `users/${uid}/ingresos`;
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



  // ============================
  // GUARDAR GASTO
  // ============================
  async guardarGasto() {
    if (this.formGasto.invalid) return;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      await firstValueFrom(this.movApi.agregarGasto(this.formGasto.value));

      this.utilsSvc.presentToast({
        message: 'Gasto guardado correctamente',
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });
      this.formGasto.reset();

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



  // ============================
  // PARTICIPANTES - DEUDA
  // ============================
  get participantesDeuda() {
    return this.formDeuda.get('participantes') as FormArray;
  }

  agregarParticipanteDeuda() {
    const name = (this.nuevoParticipanteDeuda.value || '').trim();
    if (!name) return;

    const exists = this.participantesDeuda.controls.some(
      c => c.get('nombre')?.value === name
    );
    if (!exists) {
      this.participantesDeuda.push(
        new FormGroup({
          nombre: new FormControl(name),
          porcentaje: new FormControl(0),
        })
      );
    }
    this.nuevoParticipanteDeuda.reset();
    this.recalcularPorcentajes(this.participantesDeuda);
  }


  eliminarParticipanteDeuda(index: number) {
    this.participantesDeuda.removeAt(index);
    this.recalcularPorcentajes(this.participantesDeuda);
  }

  // ============================
  // GUARDAR DEUDA
  // ============================
  async guardarDeuda() {
    if (this.formDeuda.invalid) return;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      const data = this.formDeuda.value;
      await firstValueFrom(this.movApi.agregarDeuda(data));

      this.utilsSvc.presentToast({
        message: 'Deuda guardada correctamente',
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });
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




  // ============================
  // PARTICIPANTES - OBJETIVO
  // ============================
  get participantesObjetivo() {
    return this.formObjetivo.get('participantes') as FormArray;
  }

  agregarParticipanteObjetivo() {
  const name = (this.nuevoParticipanteObjetivo.value || '').trim();
  if (!name) return;

  const exists = this.participantesObjetivo.controls.some(
    c => c.get('nombre')?.value === name
  );
  if (!exists) {
    this.participantesObjetivo.push(
      new FormGroup({
        nombre: new FormControl(name),
        porcentaje: new FormControl(0),
      })
    );
  }
  this.nuevoParticipanteObjetivo.reset();
  this.recalcularPorcentajes(this.participantesObjetivo);
}


  eliminarParticipanteObjetivo(index: number) {
    this.participantesObjetivo.removeAt(index);
    this.recalcularPorcentajes(this.participantesObjetivo);
  }

  // ============================
  // REPARTO DE PORCENTAJES
  // ============================
  recalcularPorcentajes(formArray: FormArray) {
    const total = formArray.length;
    if (total === 0) return;

    const base = Math.floor(100 / total);
    formArray.controls.forEach((ctrl) =>
      ctrl.get('porcentaje')?.setValue(base, { emitEvent: false })
    );

    const diff = 100 - base * total;
    if (diff !== 0 && total > 0) {
      const first = formArray.at(0);
      const p = first.get('porcentaje')?.value || 0;
      first.get('porcentaje')?.setValue(p + diff);
    }
  }

  // ============================
  // GUARDAR OBJETIVO
  // ============================
  async guardarObjetivo() {
    if (this.formObjetivo.invalid) return;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      const data = this.formObjetivo.value;
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

  
  // ============================
  // FUNCIONES DE AJUSTE DE PORCENTAJES
  // ============================

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


  
  // ============================
  // CAMBIOS EN "COMPARTIDO"
  // ============================
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

  porcentajeCambiadoDeuda(index: number, raw: any) {
    const val = Number(raw);
    if (!isNaN(val)) this.ajustarPorcentajeFormArray(this.participantesDeuda, index, val);
  }

  porcentajeCambiadoObjetivo(index: number, raw: any) {
    const val = Number(raw);
    if (!isNaN(val)) this.ajustarPorcentajeFormArray(this.participantesObjetivo, index, val);
  }
}

