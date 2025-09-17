import { HttpInterceptorFn } from '@angular/common/http';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { getAuth } from 'firebase/auth';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = getAuth();

  if (!auth.currentUser) {
    return next(req);
  }

  return from(auth.currentUser.getIdToken()).pipe(
    switchMap((token) => {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next(cloned);
    })
  );
};
