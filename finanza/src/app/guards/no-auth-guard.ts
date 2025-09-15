import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export const noAuthGuard: CanActivateFn = async () => {
  const auth = getAuth();
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        router.navigateByUrl('/main/home', { replaceUrl: true }); //  Si ya está logueado → directo al home
        resolve(false);
      } else {
        resolve(true); // Si NO está logueado → puede entrar (login, sign-up)
      }
    });
  });
};
