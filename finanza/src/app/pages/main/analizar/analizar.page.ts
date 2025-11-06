import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared-module';

@Component({
  selector: 'app-analizar',
  templateUrl: './analizar.page.html',
  styleUrls: ['./analizar.page.scss'],
  imports: [SharedModule]
})
export class AnalizarPage implements OnInit {
  formSegment: FormGroup;
  segmento: 'objetivos' | 'anual' = 'objetivos';

  constructor(private fb: FormBuilder) {
    this.formSegment = this.fb.group({
      tipo: ['objetivos'], // valor por defecto
    });
  }

  ngOnInit() {}

  cambiarVista() {
    this.segmento = this.formSegment.get('tipo')?.value;
  }
}
