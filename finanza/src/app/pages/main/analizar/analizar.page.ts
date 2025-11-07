import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared-module';
import { RefresherCustomEvent } from '@ionic/angular';
import { AnalizarObjetivosComponent } from 'src/app/shared/component/analizar-objetivos/analizar-objetivos.component';
import { AnalizarAnualComponent } from 'src/app/shared/component/analizar-anual/analizar-anual.component';

@Component({
  selector: 'app-analizar',
  templateUrl: './analizar.page.html',
  styleUrls: ['./analizar.page.scss'],
  imports: [SharedModule]
})
export class AnalizarPage implements OnInit {
  formSegment: FormGroup;
  segmento: 'objetivos' | 'anual' = 'objetivos';

  @ViewChild(AnalizarObjetivosComponent)
  objetivosCmp?: AnalizarObjetivosComponent;
  @ViewChild(AnalizarAnualComponent)
  anualCmp?: AnalizarAnualComponent;

  constructor(private fb: FormBuilder) {
    this.formSegment = this.fb.group({
      tipo: ['objetivos'], // valor por defecto
    });
  }

  ngOnInit() {}

  cambiarVista() {
    this.segmento = this.formSegment.get('tipo')?.value;
  }

  async onRefresh(event: RefresherCustomEvent) {
    if (this.segmento === 'objetivos') {
      try {
        await this.objetivosCmp?.reload();
      } finally {
        try { event.target.complete(); } catch {}
      }
    } else if (this.segmento === 'anual') {
      try {
        await this.anualCmp?.reload();
      } finally {
        try { event.target.complete(); } catch {}
      }
    } else {
      try { event.target.complete(); } catch {}
    }
  }
}
