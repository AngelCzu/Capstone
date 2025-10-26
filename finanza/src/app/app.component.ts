import { Component, inject, NgZone, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Utils } from './services/utils';
import { PushService } from './services/push.service';
import { IndicadoresService } from './services/indicadores.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private auth = inject(Auth);
  private injector = inject(Injector);
  private ngZone = inject(NgZone);
  utilsSvc = inject(Utils);
  pushService = inject(PushService);
  indicadoresSvc = inject(IndicadoresService);

  constructor() {}

  ngOnInit(): void {
    this.precargarUF();

    // ✅ Ejecutamos authState dentro de un contexto de inyección válido
    runInInjectionContext(this.injector, () => {
      authState(this.auth).subscribe(async (user) => {
        this.ngZone.run(async () => {
          if (user) {
            await user.getIdToken(true);
            this.pushService.init();
            console.log('[APP] Sesión restaurada');
          } else {
            console.log('[APP] No hay sesión activa');
            this.utilsSvc.routerLink('/login');
          }
        });
      });
    });
  }

  private async precargarUF() {
    try {
      const valor = await this.indicadoresSvc.getUF();
      console.log('💾 UF precargada globalmente:', valor);
    } catch (error) {
      console.warn('⚠️ No se pudo obtener UF inicial:', error);
    }
  }
}
