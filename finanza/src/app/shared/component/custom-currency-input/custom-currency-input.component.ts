import { Component, Input, OnInit, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-currency-input',
  templateUrl: './custom-currency-input.component.html',
  styleUrls: ['./custom-currency-input.component.scss'],
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomCurrencyInputComponent),
      multi: true,
    },
  ],
})
export class CustomCurrencyInputComponent implements ControlValueAccessor, OnInit {
  @Input() icon = 'cash-outline';
  @Input() label = 'Monto (CLP)';
  @Input() placeholder = '';
  visualValue = '';   // valor con puntos
  rawValue = '';      // valor sin puntos

  private onChange = (value: any) => {};
  onTouched = () => {};

  ngOnInit() {}

  writeValue(value: any): void {
    this.rawValue = value || '';
    this.visualValue = this.formatNumber(this.rawValue);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // opcional
  }

  onInputChange(event: any) {
    const input = event.target.value || '';
    this.rawValue = input.replace(/\D/g, '');
    this.visualValue = this.formatNumber(this.rawValue);
    this.onChange(this.rawValue); // el FormControl recibe valor limpio
  }

  private formatNumber(value: string): string {
    if (!value) return '';
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
