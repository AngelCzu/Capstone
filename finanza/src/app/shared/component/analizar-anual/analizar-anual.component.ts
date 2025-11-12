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
    items: Array<{ key: string; max: number; topName?: string; topVal?: number }>;
  } | null = null;

  // Series para comparación múltiple (N meses seleccionados)
  compSeries: Array<{ nombre: string; gastos: number; deudas: number; total: number }> = [];

  // Colores por categoría
  private categoriaColorMap: Record<string, string> = {};

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

  // Exportar un dashboard descargable (nueva ventana con layout dedicado)
  exportarPdf() {
    try { this.aplicarFiltrosManual(); } catch {}

    // Tomar datos actuales
    const year = this.form.value.anio as number;
    const mesesSel = (this.form.value.meses as number[] || []).slice().sort((a,b)=>a-b);
    const mesesNombres = mesesSel.map(m => this.MESES[m-1]).join(' · ');

    const series = this.compSeries?.length ? this.compSeries : [];
    const comp = this.comparacionGrafica;
    const listaMeses = this.resumenAnualFiltrado || [];

    const fmt = (n: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n||0));

    // Construir seccion comparacion (si existe)
    const comparacionHTML = comp ? `
      <section class="card">
        <h2>Comparación: ${mesesNombres || 'Meses'}</h2>
        <h3 class="sub">${year}</h3>
        ${comp.items.map(it => {
          const filas = series.map((s, idx) => {
            const val = (it.key === 'Gastos' ? s.gastos : (it.key === 'Deudas' ? s.deudas : s.total));
            const pct = Math.max(0, Math.min(100, (val / (it.max || 1)) * 100));
            const color = this.colorDeSerie(s.nombre, idx);
            return `
              <div class="row">
                <div class="label"><span class="dot" style="background:${color}"></span>${s.nombre}</div>
                <div class="track">
                  <div class="bar" style="width:${pct}%; background:${color}"></div>
                </div>
                <div class="val">${fmt(val)}</div>
              </div>`;}).join('')
          return `
            <div class="group">
              <div class="group-title">${it.key}</div>
                ${filas}
                <div class=\"top-msg\">Tu gasto fue mayor en: ${it.topName || ''} — ${fmt(it.topVal || 0)}</div>
              <div class="axis"><span>${fmt(it.max)}</span></div>
            </div>`;
        }).join('')}
      </section>
    ` : '';

    // Cards por mes seleccionado
    const mesesHTML = listaMeses.map(m => `
      <section class="card">
        <div class="card-header">
          <div class="title">${m.nombre}</div>
          <div class="sub">${m.anio}</div>
        </div>
        <div class="totales">
          <div class="line"><span>Gastos</span><strong class="gasto">${fmt(m.gastos)}</strong></div>
          <div class="line"><span>Deudas</span><strong class="deuda">${fmt(m.deudas)}</strong></div>
          <div class="line total"><span>Total</span><strong>${fmt((m.gastos||0)+(m.deudas||0))}</strong></div>
        </div>
        ${(m.topCategorias && m.topCategorias.length) ? `
        <div class="cats">
          ${m.topCategorias.map(c => {
            const ancho = ((c.monto)/(m.topCategorias?.[0]?.monto || 1))*100;
            const color = this.colorDeCategoria(c.nombre);
            return `
              <div class="cat">
                <div class="cat-name">${c.nombre}</div>
                <div class="cat-row">
                  <div class="cat-bar" style="width:${ancho}%; background:${color}"></div>
                  <div class="cat-val">${fmt(c.monto)}</div>
                </div>
              </div>`;}).join('')}
        </div>` : ''}
      </section>
    `).join('');

    const html = `<!doctype html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Dashboard anual ${year}${mesesNombres ? ' — '+mesesNombres : ''}</title>
      <style>
        :root { color-scheme: dark; }
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; margin: 0; padding: 24px; background: #071a21; color: #e8f5f7; }
        .container { max-width: 1024px; margin: 0 auto; }
        header { display:flex; justify-content: space-between; align-items:center; margin-bottom: 16px; }
        header .title { font-weight: 800; font-size: 20px; letter-spacing: -0.2px; }
        header .meta { opacity: .85; font-size: 14px; }
        .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }

        .card { background: rgba(4,43,55,.85); border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 14px; }
        .card-header { margin-bottom: 8px; }
        .card-header .title { font-weight: 800; }
        .card-header .sub { opacity: .7; font-size: 12px; }

        .totales .line { display:flex; justify-content: space-between; padding: 4px 0; }
        .gasto{ color: #ff4d4d; } .deuda{ color: #ffd166; }

        .group { margin-top: 8px; }
        .group-title { font-weight: 700; margin-bottom: 8px; }
        .row { display:grid; grid-template-columns: 120px 1fr auto; align-items:center; gap:10px; margin: 4px 0; }
        .label { display:inline-flex; align-items:center; gap:8px; }
        .dot { width:10px; height:10px; border-radius:50%; display:inline-block; }
        .track { position:relative; height:14px; border-radius:7px; background: rgba(255,255,255,.06); overflow:hidden;
                background-image: linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px); background-size: 25% 100%; }
        .bar { height:100%; border-radius:7px; }
        .val { font-weight: 700; font-size: 12px; }
        .top-msg { display:flex; justify-content:flex-start; opacity:.85; font-size:12px; margin-top:6px; }
        .axis { display:none; }

        .cats .cat { margin: 6px 0; }
        .cat-name { font-size: 12px; opacity: .9; }
        .cat-row { display:grid; grid-template-columns: 1fr auto; align-items:center; gap:10px; }
        .cat-bar { height: 10px; border-radius: 6px; background: #3880ff; }
        .cat-val { font-weight: 700; font-size: 12px; }

        @media print { body { padding: 0; } .container { max-width: none; padding: 14mm; }
          header .actions { display:none; } }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <div class="title">Dashboard anual ${year}</div>
          <div class="meta">${mesesNombres || 'Todos los meses filtrados'}</div>
          <div class="actions"><button onclick="window.print()">Imprimir / PDF</button></div>
        </header>
        ${comparacionHTML}
        <div class="grid">${mesesHTML}</div>
      </div>
    </body>
    </html>`;

    // Render en iframe oculto y abrir vista de impresión (PDF) sin nueva pestaña
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const idoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!idoc) return;
    idoc.open();
    idoc.write(html);
    idoc.close();

    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch {}
    };
    try { iframe.contentWindow?.addEventListener('afterprint', cleanup); } catch {}

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('No se pudo iniciar impresión', e);
        cleanup();
      }
    }, 200);
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

    // Construcción de items con el nombre/valor del mayor
    this.comparacionGrafica = {
      items: items.map(it => {
        let bestIdx = 0;
        for (let i = 1; i < it.vals.length; i++) {
          if ((it.vals[i] || 0) > (it.vals[bestIdx] || 0)) bestIdx = i;
        }
        return {
          key: it.key,
          max: it.max,
          topName: series[bestIdx]?.nombre || '',
          topVal: it.vals[bestIdx] || 0,
        };
      })
    } as any;

    // Guardamos series públicas para la plantilla múltiple
    this.compSeries = series;
  }

  // Color por categoría con fallback determinístico
  private buildCategoriaColorMap() {
    try {
      const cats = JSON.parse(localStorage.getItem('userCategorias') || '[]') || [];
      for (const c of cats) {
        const nombre = c?.nombre || c?.id;
        const color = c?.color;
        if (nombre && color) this.categoriaColorMap[nombre] = color;
      }
    } catch {}
  }

  colorDeCategoria(nombre: string): string {
    if (!Object.keys(this.categoriaColorMap).length) this.buildCategoriaColorMap();
    if (this.categoriaColorMap[nombre]) return this.categoriaColorMap[nombre];
    // Fallback: hash -> HSL
    let hash = 0;
    for (let i = 0; i < (nombre || '').length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    const color = `hsl(${hue}, 72%, 55%)`;
    this.categoriaColorMap[nombre] = color;
    return color;
  }

  // Paleta para meses seleccionados: consistente por índice o nombre
  private mesPalette = [
    'var(--ion-color-primary)',
    'var(--ion-color-tertiary)',
    'var(--ion-color-warning)',
    'var(--ion-color-success)',
    'var(--ion-color-danger)',
    'var(--ion-color-secondary)',
    'var(--ion-color-medium)'
  ];

  colorDeMes(nombre: string, idx?: number): string {
    if (typeof idx === 'number') {
      return this.mesPalette[idx % this.mesPalette.length];
    }
    // Fallback determinístico por nombre
    let hash = 0;
    for (let i = 0; i < (nombre || '').length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) | 0;
    const base = Math.abs(hash) % this.mesPalette.length;
    return this.mesPalette[base];
  }

  // Color para series de comparación
  colorDeSerie(nombre: string, idx: number): string {
    const categoria = (this.form.value.categoria || 'todas') as string;
    if (categoria && categoria !== 'todas') {
      return this.colorDeCategoria(categoria);
    }
    return this.colorDeMes(nombre, idx);
  }

  // Getter para listar meses disponibles según año seleccionado en el filtro
  // Compat: ya no se usa selector de comparar explícito
}
