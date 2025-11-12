import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared-module';
import { RefresherCustomEvent } from '@ionic/angular';
import { AnalizarObjetivosComponent } from 'src/app/shared/component/analizar-objetivos/analizar-objetivos.component';
import { AnalizarAnualComponent } from 'src/app/shared/component/analizar-anual/analizar-anual.component';
import { UserApi } from 'src/app/services/apis/user.api';

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

  constructor(private fb: FormBuilder, private userApi: UserApi) {
    this.formSegment = this.fb.group({
      tipo: ['objetivos'], // valor por defecto
    });
  }

  ngOnInit() {}

  cambiarVista() {
    this.segmento = this.formSegment.get('tipo')?.value;
  }

  async onRefresh(event: RefresherCustomEvent) {
    // Refresca toda la página (datos globales + ambos componentes)
    // y conserva el segmento actual sin mover al usuario.
    const complete = () => { try { event.target.complete(); } catch {} };
    try {
      const current: 'objetivos' | 'anual' = (this.formSegment.get('tipo')?.value || this.segmento) as any;

      const tasks: Promise<any>[] = [];
      const p0 = this.userApi?.obtenerDatosCompletosUsuario?.();
      const p1 = this.objetivosCmp?.reload?.();
      const p2 = this.anualCmp?.reload?.();
      if (p0 && typeof (p0 as any).then === 'function') tasks.push(p0 as Promise<any>);
      if (p1 && typeof (p1 as any).then === 'function') tasks.push(p1 as Promise<any>);
      if (p2 && typeof (p2 as any).then === 'function') tasks.push(p2 as Promise<any>);
      if (tasks.length) {
        await Promise.all(tasks.map(p => p.catch(() => undefined)));
      }

      // Restaurar selección de segmento sin disparar eventos
      this.formSegment.patchValue({ tipo: current }, { emitEvent: false });
      this.segmento = current;
    } finally {
      setTimeout(complete, 0);
    }
  }
}
