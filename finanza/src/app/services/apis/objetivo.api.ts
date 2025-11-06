import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ObjetivoApi {


  http      = inject(HttpClient)

  private baseUrl = '/api/v1/users/me';
  constructor() {}

  // Obtener Objetivos
  getObjetivos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/objetivos`);
  }
  

  // Actualizar un objetivo
  updateObjetivo(id: string, data: any): Observable<{ ok: boolean; message: string }> {
    return this.http.patch<{ ok: boolean; message: string }>(
      `${this.baseUrl}/movimientos/${id}`,
      data
    );
  }


  // Eliminar un objetivo
  deleteObjetivo(id: string): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }
}
