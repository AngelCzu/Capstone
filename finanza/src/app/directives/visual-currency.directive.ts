import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';
import { IonInput } from '@ionic/angular';

@Directive({
  selector: '[appVisualCurrency]',
  standalone: false,
})
export class VisualCurrencyDirective {
  private rawValue = '';

  constructor(private el: ElementRef<IonInput>, private renderer: Renderer2) {}

  @HostListener('ionInput', ['$event'])
  onIonInput(event: CustomEvent) {
    const ionInput = event.target as HTMLIonInputElement;
    const inputValue = (event.detail as any).value?.toString() ?? '';

    // 1️⃣ Guardamos solo los dígitos puros
    this.rawValue = inputValue.replace(/\D/g, '');

    // 2️⃣ Formateamos para mostrar con puntos de miles
    const formatted = this.formatNumber(this.rawValue);

    // 3️⃣ Mostramos visualmente el valor formateado
    (ionInput as any).setFocus && (ionInput as any).setFocus(); // mantener foco
    (ionInput as any).value = formatted;

    // 4️⃣ Emitimos el valor limpio al FormControl
    ionInput.dispatchEvent(
      new CustomEvent('ionChange', {
        detail: { value: this.rawValue },
        bubbles: true,
        cancelable: true,
      })
    );
  }

  private formatNumber(value: string): string {
    if (!value) return '';
    // Separador de miles con puntos (1.000.000)
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
