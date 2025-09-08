import { Component, ElementRef, Input, ViewChild, OnChanges, SimpleChanges, HostListener } from '@angular/core';

type ExpenseSeg = { label: string; value: number; color: string; muted?: boolean };

@Component({
  selector: 'app-storage-bar',
  templateUrl: './storage-bar.component.html',
  styleUrls: ['./storage-bar.component.scss'],
  standalone: false,
})
export class StorageBarComponent implements OnChanges {
  @Input() expenses: { label: string; value: number; color: string; muted?: boolean }[] = [];
  @Input() totalIncome = 0;
  @Input() heightPx = 28;
  @Input() rounded = 14;
  @Input() decimals = 2;
  @Input() showLegend = true;

  @ViewChild('barRef', { static: true }) barRef!: ElementRef<HTMLDivElement>;

  selectedIndex: number | null = null;  // clic/tap
  hoveredIndex: number | null = null;   // hover/focus

  centersPct: number[] = [];
  widthsPct: number[] = [];
  calloutLeftPx = 0;

  get totalExpenses(): number {
    return this.expenses.reduce((a, s) => a + (s.value || 0), 0);
  }

  get usedPct(): number {
    if (this.totalIncome <= 0) return 0;
    return Math.min(100, (this.totalExpenses / this.totalIncome) * 100);
  }

  /** índice “activo” para UI (seleccionado si existe, si no el hovered) */
  get currentIndex(): number | null {
    return this.selectedIndex !== null ? this.selectedIndex : this.hoveredIndex;
  }

  private recompute(): void {
    const income = this.totalIncome > 0 ? this.totalIncome : 1;
    let acc = 0;
    this.widthsPct = this.expenses.map(seg => Math.max(0, (seg.value / income) * 100));
    this.centersPct = this.widthsPct.map(w => {
      const c = acc + w / 2;
      acc += w;
      return c;
    });
    this.updateCallout();
  }

  ngOnChanges(_: SimpleChanges): void {
    this.recompute();
  }

  select(i: number) {
    this.selectedIndex = this.selectedIndex === i ? null : i;
    this.updateCallout();
  }

  hover(i: number | null) {
    this.hoveredIndex = i;
    // si no hay seleccionado, mueve el callout al hovered
    if (this.selectedIndex === null) this.updateCallout();
  }

  updateCallout() {
    const idx = this.currentIndex;
    if (idx == null || !this.barRef) return;
    const centerPct = this.centersPct[idx] ?? 0;
    const rect = this.barRef.nativeElement.getBoundingClientRect();
    const x = (centerPct / 100) * rect.width;
    const pad = 8;
    this.calloutLeftPx = Math.max(pad, Math.min(rect.width - pad, x));
  }

  /** helpers de clase */
  isActive(i: number) {
    const idx = this.currentIndex;
    return idx !== null && idx === i;
  }
  isDim(i: number) {
    const idx = this.currentIndex;
    return idx !== null && idx !== i;
  }
  
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const barEl = this.barRef?.nativeElement;
    if (!barEl) return;

    // Si el click fue dentro de la barra o de la leyenda, no cierres
    if (barEl.contains(event.target as Node) || 
        (this.host.nativeElement as HTMLElement).contains(event.target as Node)) {
      return;
    }

    // Click fuera → limpia selección
    this.selectedIndex = null;
  }

  constructor(private host: ElementRef) {}
  
}