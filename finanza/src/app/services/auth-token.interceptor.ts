import { inject, Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { getAuth, signOut } from 'firebase/auth';
import { Utils } from './utils';
import { Auth } from '@angular/fire/auth';

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  constructor() {}

  // Inyeccion
  
  utilsSvc = inject(Utils)
  auth = inject(Auth)
   intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const currentUser = this.auth.currentUser;

    // 🧩 Si no hay usuario autenticado, continuar sin token
    if (!currentUser) return next.handle(req);

    // 🕒 Esperar a obtener el token actual antes de continuar
    return from(currentUser.getIdToken(true)).pipe(
      switchMap((token) => {
        // 🔐 Clonar la request agregando el header Authorization
        const cloned = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next.handle(cloned);
      })
    );
  }
}
