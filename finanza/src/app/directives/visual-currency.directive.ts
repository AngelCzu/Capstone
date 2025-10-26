import { Directive, ElementRef, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';
import { IonInput } from '@ionic/angular';

@Directive({
  selector: '[appVisualCurrency]',
  standalone: false,
})
export class VisualCurrencyDirective {
  private rawValue = '';

  constructor(
    private el: ElementRef<IonInput>,
    private ngControl: NgControl
  ) {}

  @HostListener('ionInput', ['$event'])
  onIonInput(event: CustomEvent) {
    const ionInput = event.target as HTMLIonInputElement;
    const inputValue = (event.detail as any)?.value?.toString() ?? '';

    // 1️⃣ Eliminar todo lo que no sea número
    this.rawValue = inputValue.replace(/[^0-9]/g, '');

    // 2️⃣ Formatear visualmente con puntos de miles
    const formatted = this.formatNumber(this.rawValue);

    // 3️⃣ Mostrar el valor formateado
    ionInput.value = formatted;

    // 4️⃣ Actualizar el FormControl con el valor limpio
    if (this.ngControl?.control) {
      this.ngControl.control.setValue(this.rawValue, { emitEvent: false });
    }
  }

  private formatNumber(value: string): string {
    if (!value) return '';
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
