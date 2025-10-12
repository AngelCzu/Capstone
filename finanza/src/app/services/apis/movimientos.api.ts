import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MovimientosApi {
  constructor(private http: HttpClient) {}
  private baseUrl = '/api/v1/users/me';


  agregarIngreso(data: any) {
    return this.http.post(`${this.baseUrl}/ingresos`, data);
  }

  agregarGasto(data: any) {
    return this.http.post(`${this.baseUrl}/gastos`, data);
  }

  agregarDeuda(data: any) {
    return this.http.post(`${this.baseUrl}/deudas`, data);
  }

  agregarObjetivo(data: any) {
    return this.http.post(`${this.baseUrl}/objetivos`, data);
  }


  //============================================= CATEGORIAS ============================================================//
  obtenerCategorias(tipo: string): Observable<{ ok: boolean; categorias: any[] }> {
    return this.http.get<{ ok: boolean; categorias: any[] }>(
      `${this.baseUrl}/categorias?tipo=${tipo}`
    );
  }

  agregarCategoria(data: any): Observable<{ ok: boolean; id: string }> {
    return this.http.post<{ ok: boolean; id: string }>(`${this.baseUrl}/categorias`, data);
  }
}
