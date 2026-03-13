import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Esperamos el estado real de Firebase
  const user = await new Promise<any>((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub(); // evitamos leaks
      resolve(u);
    });
  });

  if (user) {
    // Si hay un usuario autenticado, verifica el token
    const token = await user.getIdToken();
    if (token) {
      return true; // ✅ Autenticado → puede pasar
    }
  }

  // Si no hay usuario o el token no es válido, redirige al login
  router.navigateByUrl('/login', { replaceUrl: true });
  return false;
};
