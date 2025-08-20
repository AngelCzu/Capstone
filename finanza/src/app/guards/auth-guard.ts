import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { Firebase } from '../services/firebase';
import { Utils } from '../services/utils';



export const authGuard: CanActivateFn = (route, state) => {

  // Inyectar servicios 
  const firebaseSvc = inject(Firebase);
  const utilsSvc = inject(Utils);
  
  let user = utilsSvc.getLocalStorage('user');  

  return new Promise((resolve) => {

      firebaseSvc.getAuth().onAuthStateChanged((auth) => {
      if (auth) {
        if(user) resolve(true); // El usuario está autenticado
      }else {
        utilsSvc.routerLink('/login'); // Redirigir al usuario a la página de inicio de sesión
        resolve(false); // El usuario no está autenticado
      }
  })
  

  });

}
