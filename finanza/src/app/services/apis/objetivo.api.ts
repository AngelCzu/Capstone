import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ObjetivoApi {


  http      = inject(HttpClient)
  constructor() {}

getObjetivos(): Observable<any> {
    return this.http.get('/api/v1/users/me/objetivos');
  }
  
}
