import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

import { Utils } from './services/utils';
import { PushService } from './services/push.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private router = inject(Router);
  utilsSvc = inject(Utils);
  pushService =  inject(PushService);
  constructor() { }


ngOnInit(): void {
  this.auth.onAuthStateChanged(async (user) => {
    if (user) {
      await user.getIdToken(true); // 👈 asegura token fresco
      this.pushService.init();
      console.log('[APP] Sesión restaurada');
      
      // ya puedes llamar a /users/me o redirigir a home
    } else {
      console.log('[APP] No hay sesión activa');
      this.utilsSvc.routerLink('/login');
    }
  });
}


}