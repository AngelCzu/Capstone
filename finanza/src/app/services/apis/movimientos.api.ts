import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MovimientosApi {
  constructor(private http: HttpClient) {}
  private baseUrl = `${environment.apiUrl}/users/me`;


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


  // ✅ EDITAR movimiento (ej: aporte/ahorro): PATCH /movimientos/:id
  actualizarMovimiento(id: string, data: any) {
    return this.http.patch<{ ok: boolean; message: string }>(
      `${this.baseUrl}/movimientos/${id}`,
      data
    );
  }

eliminarMovimiento(id: string, tipo: string) {
  return this.http.delete<{ ok: boolean; message: string }>(`${this.baseUrl}/movimientos/${id}`);
}

// Obtener movimientos historicos
obtenerMovimientos() {
  return this.http.get<any[]>(`${this.baseUrl}/movimientos/historico`);
}




}
