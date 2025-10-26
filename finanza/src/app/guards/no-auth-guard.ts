import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

export const noAuthGuard: CanActivateFn = async () => {
  const auth = inject(Auth); // 👈 inyecta, no uses getAuth()
  const router = inject(Router);

  const user = await new Promise<any>((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });

  if (user) {
    router.navigateByUrl('/main/home', { replaceUrl: true });
    return false;
  } else {
    return true;
  }
};
