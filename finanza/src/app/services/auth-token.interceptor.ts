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

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  constructor() {}

  // Inyeccion
  
  utilsSvc = inject(Utils)
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      // 🔥 CORRECCIÓN: getIdToken(true) → siempre refresca el token
      return from(user.getIdToken(true)).pipe(
        switchMap((token) => {
          const authReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });

          return next.handle(authReq).pipe(
            catchError((error: HttpErrorResponse) => {
              if (error.status === 401) {
                console.warn('[AUTH] Token inválido → cerrando sesión');
                // ⚡ signOut devuelve Promise, lo lanzamos en background
                signOut(auth).then(() => {
                  this.utilsSvc.routerLink('/login');
                });
              }
              // 🔥 CORRECCIÓN: devolvemos Observable de error, no Promise
              return throwError(() => error);
            })
          );
        })
      );
    }else {
      // No hay usuario, no hacemos nada
      return next.handle(req);
    } 

  }
}
