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
  // PRIMARY
  { name: 'primary', value: 'var(--ion-color-primary)' },
  { name: 'primary-shade', value: 'var(--ion-color-primary-shade)' },
  { name: 'primary-tint', value: 'var(--ion-color-primary-tint)' },

  // SECONDARY
  { name: 'secondary', value: 'var(--ion-color-secondary)' },
  { name: 'secondary-shade', value: 'var(--ion-color-secondary-shade)' },
  { name: 'secondary-tint', value: 'var(--ion-color-secondary-tint)' },

  // TERTIARY
  { name: 'tertiary', value: 'var(--ion-color-tertiary)' },
  { name: 'tertiary-shade', value: 'var(--ion-color-tertiary-shade)' },
  { name: 'tertiary-tint', value: 'var(--ion-color-tertiary-tint)' },

  // SUCCESS
  { name: 'success', value: 'var(--ion-color-success)' },
  { name: 'success-shade', value: 'var(--ion-color-success-shade)' },
  { name: 'success-tint', value: 'var(--ion-color-success-tint)' },

  // WARNING
  { name: 'warning', value: 'var(--ion-color-warning)' },
  { name: 'warning-shade', value: 'var(--ion-color-warning-shade)' },
  { name: 'warning-tint', value: 'var(--ion-color-warning-tint)' },

  // DANGER
  { name: 'danger', value: 'var(--ion-color-danger)' },
  { name: 'danger-shade', value: 'var(--ion-color-danger-shade)' },
  { name: 'danger-tint', value: 'var(--ion-color-danger-tint)' },

  // MEDIUM (neutro y gris usable)
  { name: 'medium', value: 'var(--ion-color-medium)' },
  { name: 'medium-shade', value: 'var(--ion-color-medium-shade)' },
  { name: 'medium-tint', value: 'var(--ion-color-medium-tint)' },

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
}
