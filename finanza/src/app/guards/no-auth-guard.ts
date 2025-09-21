import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export const noAuthGuard: CanActivateFn = async () => {
  const auth = getAuth();
  const router = inject(Router);

  // 🔥 Esperamos el estado real de Firebase
  const user = await new Promise<any>((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });

  if (user) {
    router.navigateByUrl('/main/home', { replaceUrl: true }); // donde quieras redirigir si YA está logueado
    return false;
  } else {
    return true; // No autenticado → puede entrar (ej: login, register)
  }
};
