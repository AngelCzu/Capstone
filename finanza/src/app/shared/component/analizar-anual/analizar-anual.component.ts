import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, firstValueFrom } from 'rxjs';

type TipoMov = 'ingreso' | 'gasto' | 'deuda' | 'objetivo' | 'sin-tipo';

interface Movimiento {
  id: string;
  tipo: TipoMov;
  origen: string;
  monto: number;
  moneda: string;
  fecha: string;
  categoria?: string;
  cuotas?: number;
}

interface ResumenMes {
  anio: number;
  mes: number;
  nombre: string;
  ingresos: number;
  gastos: number;
  deudas: number;
  topCategorias: { nombre: string; monto: number }[];
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

@Component({
  selector: 'app-analizar-anual',
  templateUrl: './analizar-anual.component.html',
  styleUrls: ['./analizar-anual.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalizarAnualComponent implements OnInit {

  filtrosAbiertos = true;
  MESES = MESES;

  form: FormGroup = this.fb.group({
    anio: [new Date().getFullYear()],
    meses: [[] as number[]],
    tipos: this.fb.nonNullable.group({
      gasto: true,
      deuda: true
    }),
    categoria: ['todas']
  });

  categorias: string[] = [];
  aniosDisponibles: number[] = [];
  private movimientos$ = new BehaviorSubject<Movimiento[]>([]);
  resumenAnualFiltrado: ResumenMes[] = [];

  comparacion: { label: string; sub: string; gastos: number; deudas: number; total: number } | null = null;
  comparacionGrafica: {
    m1Nombre: string;
    m2Nombre: string;
    items: Array<{ key: string; m1: number; m2: number; max: number }>;
  } | null = null;

  // Series para comparación múltiple (N meses seleccionados)
  compSeries: Array<{ nombre: string; gastos: number; deudas: number; total: number }> = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.cargarHistorico().subscribe((movs) => {
      this.movimientos$.next(movs);
      this.categorias = this.extraerCategorias(movs);
      this.aniosDisponibles = this.extraerAnios(movs);

      const actual = this.form.value.anio as number;
      if (!this.aniosDisponibles.includes(actual) && this.aniosDisponibles.length) {
        this.form.patchValue({ anio: this.aniosDisponibles[0] });
      }

      // Por defecto: comparar mes actual y anterior (si existen),
      // de lo contrario elegir los últimos 2 meses del año seleccionado
      this.seleccionarMesActualYAnterior(false);
      this.recalcular();
      this.form.valueChanges.subscribe(() => this.recalcular());
    });
  }

  async reload() {
    await this.ngOnInit();
  }

  toggleFiltros() {
    this.filtrosAbiertos = !this.filtrosAbiertos;
  }

  aplicarFiltrosManual() {
    this.recalcular();
  }

  toggleTipo(k: 'gasto' | 'deuda') {
    const curr = this.form.value.tipos?.[k] ?? false;
    this.form.patchValue({ tipos: { ...this.form.value.tipos, [k]: !curr } });
  }

  seleccionarUltimosMeses(n: number, trigger = true) {
    const anio = this.form.value.anio as number;
    const mesesDisp = this.obtenerMesesDisponibles(anio);
    const pick = mesesDisp.slice(0, n);
    this.form.patchValue({ meses: pick });
    if (trigger) this.recalcular();
  }

  private obtenerMesesDisponibles(anio: number): number[] {
    return Array.from(
      new Set(
        this.movimientos$.value
          .filter(m => new Date(m.fecha).getUTCFullYear() === anio)
          .map(m => new Date(m.fecha).getUTCMonth() + 1)
      )
    ).sort((a,b) => b-a); // desc
  }

  // Selecciona m1/m2 = mes actual y anterior si existen en el año seleccionado;
  // si no, cae a últimos 2 meses disponibles. No dispara recalcular si trigger=false
  seleccionarMesActualYAnterior(trigger = true) {
    const anio = this.form.value.anio as number;
    const mesesDisp = this.obtenerMesesDisponibles(anio);
    const now = new Date();
    const currMonth = now.getMonth() + 1;
    const prevMonth = currMonth === 1 ? 12 : currMonth - 1;
    const currOk = mesesDisp.includes(currMonth);
    const prevOk = mesesDisp.includes(prevMonth);

    if (currOk && prevOk && (anio === now.getFullYear())) {
      this.form.patchValue({ meses: [prevMonth, currMonth] });
    } else {
      const pick = mesesDisp.slice(0, 2);
      this.form.patchValue({ meses: pick });
    }
    if (trigger) this.recalcular();
  }

  private cargarHistorico() {
    return this.http.get<Movimiento[]>('/api/v1/users/me/movimientos/historico').pipe(
      map(arr => arr || [])
    );
  }

  private extraerCategorias(movs: Movimiento[]): string[] {
    const set = new Set<string>();
    for (const m of movs) {
      const c = (m.categoria || '').trim();
      if (c && c !== 'Sin categoría') set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  private extraerAnios(movs: Movimiento[]): number[] {
    const s = new Set<number>();
    movs.forEach(m => s.add(new Date(m.fecha).getUTCFullYear()));
    return Array.from(s).sort((a,b) => b-a);
  }

  private recalcular() {
    const { anio, meses, tipos, categoria } = this.form.value as {
      anio: number; meses: number[]; tipos: { gasto: boolean; deuda: boolean }; categoria: string;
    };

    const filtrados = this.movimientos$.value.filter(m => {
      const d = new Date(m.fecha);
      const y = d.getUTCFullYear();
      const mm = d.getUTCMonth() + 1;
      if (y !== anio) return false;
      if (meses && meses.length && !meses.includes(mm)) return false;
      const tipoOk =
        (tipos?.gasto && m.tipo === 'gasto') ||
        (tipos?.deuda && m.tipo === 'deuda');
      if (!tipoOk) return false;
      if (categoria !== 'todas') {
        const cat = (m.categoria || '').trim();
        if (cat !== categoria) return false;
      }
      return true;
    });

    const byKey = new Map<string, ResumenMes & { _catMap: Map<string, number> }>();
    for (const m of filtrados) {
      const d = new Date(m.fecha);
      const anioM = d.getUTCFullYear();
      const mes = d.getUTCMonth() + 1;
      const key = `${anioM}-${mes.toString().padStart(2, '0')}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          anio: anioM, mes, nombre: `${MESES[mes - 1]}`,
          ingresos: 0, gastos: 0, deudas: 0,
          topCategorias: [],
          _catMap: new Map<string, number>(),
        });
      }
      const acc = byKey.get(key)!;

      if (m.tipo === 'gasto') {
        acc.gastos += m.monto || 0;
        const cnom = m.categoria || 'Sin categoría';
        acc._catMap.set(cnom, (acc._catMap.get(cnom) || 0) + (m.monto || 0));
      } else if (m.tipo === 'deuda') {
        const cuotas = m.cuotas && m.cuotas > 0 ? m.cuotas : 1;
        const cuotaMes = (m.monto || 0) / cuotas;
        acc.deudas += cuotaMes;
        const cnom = m.categoria || 'Deudas';
        acc._catMap.set(cnom, (acc._catMap.get(cnom) || 0) + cuotaMes);
      }
    }

    const lista: ResumenMes[] = Array.from(byKey.values())
      .map(x => {
        const topCategorias = Array.from(x._catMap.entries())
          .map(([nombre, monto]) => ({ nombre, monto }))
          .sort((a, b) => b.monto - a.monto)
          .slice(0, 4);
        return {
          anio: x.anio, mes: x.mes, nombre: x.nombre,
          ingresos: 0,
          gastos: Math.round(x.gastos),
          deudas: Math.round(x.deudas),
          topCategorias
        };
      })
      .sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes));

    const mesesSel = meses ?? [];
    this.resumenAnualFiltrado = (mesesSel.length ? lista.filter(x => mesesSel.includes(x.mes)) : lista)
      .sort((a,b) => b.mes - a.mes);

    this.calcularComparacion(this.resumenAnualFiltrado);
  }

  private calcularComparacion(lista: ResumenMes[]) {
    this.comparacion = null;
    this.comparacionGrafica = null;
    const mesesSel = (this.form.value.meses as number[] || []).slice().sort((a,b) => a-b);
    if (!mesesSel || mesesSel.length < 2) return;

    const seleccion = mesesSel
      .map(mesNum => lista.find(x => x.mes === mesNum))
      .filter(Boolean) as ResumenMes[];
    if (seleccion.length < 2) return;

    this.comparacion = {
      label: seleccion.map(s => s.nombre).join(' · '),
      sub: `${seleccion[0].anio}`,
      gastos: 0,
      deudas: 0,
      total: 0,
    };

    const series = seleccion.map(s => ({
      nombre: s.nombre,
      gastos: s.gastos || 0,
      deudas: s.deudas || 0,
      total: (s.gastos || 0) + (s.deudas || 0),
    }));

    const maxG = Math.max(...series.map(s => s.gastos), 1);
    const maxD = Math.max(...series.map(s => s.deudas), 1);
    const maxT = Math.max(...series.map(s => s.total), 1);

    const items = [
      { key: 'Gastos', max: maxG, vals: series.map(s => s.gastos) },
      { key: 'Deudas', max: maxD, vals: series.map(s => s.deudas) },
      { key: 'Total',  max: maxT, vals: series.map(s => s.total)  },
    ];

    this.comparacionGrafica = {
      m1Nombre: '',
      m2Nombre: '',
      items: items.map(it => ({ key: it.key, m1: 0, m2: 0, max: it.max })) as any,
    } as any;

    // Guardamos series públicas para la plantilla múltiple
    this.compSeries = series;
  }

  // Getter para listar meses disponibles según año seleccionado en el filtro
  // Compat: ya no se usa selector de comparar explícito
}
