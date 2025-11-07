import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map } from 'rxjs';

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

      this.seleccionarUltimosMeses(2, false);
      this.recalcular();
      this.form.valueChanges.subscribe(() => this.recalcular());
    });
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
    const mesesDisp = Array.from(
      new Set(
        this.movimientos$.value
          .filter(m => new Date(m.fecha).getUTCFullYear() === anio)
          .map(m => new Date(m.fecha).getUTCMonth() + 1)
      )
    ).sort((a,b) => b-a);
    const pick = mesesDisp.slice(0, n);
    this.form.patchValue({ meses: pick });
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
    const mesesSel = this.form.value.meses as number[];
    if (mesesSel && mesesSel.length === 2) {
      const [m1Mes, m2Mes] = [...mesesSel].sort((a,b) => a-b);
      const m1 = lista.find(x => x.mes === m1Mes);
      const m2 = lista.find(x => x.mes === m2Mes);
      if (m1 && m2) {
        this.comparacion = {
          label: `${m1.nombre} vs ${m2.nombre}`,
          sub: `${m1.anio}`,
          gastos: m2.gastos - m1.gastos,
          deudas: m2.deudas - m1.deudas,
          total: (m2.gastos + m2.deudas) - (m1.gastos + m1.deudas)
        };
      }
    }
  }
}
