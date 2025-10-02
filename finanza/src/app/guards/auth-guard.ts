import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export const authGuard: CanActivateFn = async () => {
  const auth = getAuth();
  const router = inject(Router);

  // 🔥 Esperamos el estado real de Firebase
  const user = await new Promise<any>((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub(); // evitamos leaks
      resolve(u);
    });
  });

  if (user) {
    return true; // ✅ Autenticado → puede pasar
  } else {
    router.navigateByUrl('/login', { replaceUrl: true });
    return false;
  }
};
