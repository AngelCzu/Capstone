import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SharedModule } from '../../shared-module';

@Component({
  selector: 'app-modal-generic',
  templateUrl: './modal-generic.component.html',
  styleUrls: ['./modal-generic.component.scss'],
  imports: [SharedModule,],
})
export class GenericModalComponent implements OnInit {

  @Input() title!: string;
  @Input() message?: string;
  @Input() icon?: string;
  @Input() fields: Array<{
    name: string;
    label: string;
    type: string;
    required?: boolean;
    default?: any;
    options?: Array<{ label: string; value: any }>;
  }> = [];
  @Input() confirmText: string = 'Guardar';
  @Input() cancelText: string = 'Cancelar';
  @Input() color: string = 'primary';

  form!: FormGroup;

  // 🎨 Paleta extendida de colores Ionic (27 tonos)
  ionicColorsExtended = [
  // PRIMARY (azul Ionic)
  { name: 'primary', value: '#3880ff' },
  { name: 'primary-shade', value: '#3171e0' },
  { name: 'primary-tint', value: '#4c8dff' },

  // SECONDARY (morado claro)
  { name: 'secondary', value: '#5260ff' },
  { name: 'secondary-shade', value: '#4854e0' },
  { name: 'secondary-tint', value: '#6370ff' },

  // TERTIARY (turquesa)
  { name: 'tertiary', value: '#2dd36f' },
  { name: 'tertiary-shade', value: '#28ba62' },
  { name: 'tertiary-tint', value: '#42d77d' },

  // SUCCESS (verde)
  { name: 'success', value: '#10dc60' },
  { name: 'success-shade', value: '#0ec254' },
  { name: 'success-tint', value: '#28e070' },

  // WARNING (amarillo)
  { name: 'warning', value: '#ffce00' },
  { name: 'warning-shade', value: '#e0b500' },
  { name: 'warning-tint', value: '#ffd31a' },

  // DANGER (rojo)
  { name: 'danger', value: '#f04141' },
  { name: 'danger-shade', value: '#d33939' },
  { name: 'danger-tint', value: '#f25454' },

  // MEDIUM (gris neutro)
  { name: 'medium', value: '#92949c' },
  { name: 'medium-shade', value: '#808289' },
  { name: 'medium-tint', value: '#9d9fa6' }
];



  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    const group: any = {};
    this.fields.forEach(f => {
      group[f.name] = [
        f.default ?? '',
        f.required ? Validators.required : []
      ];
    });
    this.form = this.fb.group(group);
  }

  confirmar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.modalCtrl.dismiss(this.form.value);
  }

  cancelar() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

colorDisabled(colorValue: string, usados: any[] = []): boolean {
  const normalize = (c: string) => c.toLowerCase().replace(/\s/g, '');

  // Extrae los valores correctos según el tipo de datos
  const usadosNormalizados = usados.map((u: any) => {
    if (typeof u === 'string') return normalize(u);
    if (u && typeof u.value === 'string') return normalize(u.value);
    return '';
  });

  return usadosNormalizados.includes(normalize(colorValue));
}


}
