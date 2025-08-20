import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { Firebase } from '../services/firebase';
import { Utils } from '../services/utils';

export const noAuthGuard: CanActivateFn = (route, state) => {
  // Inyectar servicios 
  const firebaseSvc = inject(Firebase);
  const utilsSvc = inject(Utils);


  return new Promise((resolve) => {

    firebaseSvc.getAuth().onAuthStateChanged((auth) => {
      if (!auth) {
         resolve(true); // El usuario está autenticado
      } else {
        utilsSvc.routerLink('/main/home'); // Redirigir al usuario a la página de inicio de sesión
        resolve(false); // El usuario no está autenticado
      }
    })


  });

}
