import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = async () => {
  const auth = getAuth();
  const router = inject(Router);

  return new Promise<boolean>((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(true); // Usuario autenticado → puede pasar
      } else {
        router.navigateByUrl('/login', { replaceUrl: true }); //  Bloquea y redirige
        resolve(false);
      }
    });
  });
};
