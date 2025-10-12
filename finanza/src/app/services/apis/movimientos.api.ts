import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

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
  // Obtener categorías (por defecto de tipo 'movimiento')
  getCategorias(tipo: string = 'movimiento') {
    return this.http.get(`${this.baseUrl}/categorias?tipo=${tipo}`);
  }

  // Agregar una nueva categoría
  agregarCategoria(data: any) {
    return this.http.post(`${this.baseUrl}/categorias`, data);
  }

  // Eliminar una categoría por ID
  eliminarCategoria(id: string) {
    return this.http.delete(`${this.baseUrl}/categorias/${id}`);
  }
}
