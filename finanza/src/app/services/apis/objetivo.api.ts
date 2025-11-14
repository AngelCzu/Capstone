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
  
  getObjetivoDetalle(id: string) {
    return this.http.get(`${this.baseUrl}/objetivos/${id}`);
  }


  reajustarPlan(id: string, data: any) {
    return this.http.post(`${this.baseUrl}/objetivos/${id}/reajustar_plan`, data);
  }


  // Actualizar un objetivo
  updateObjetivo(id: string, data: any): Observable<{ ok: boolean; message: string }> {
    return this.http.patch<{ ok: boolean; message: string }>(
      `${this.baseUrl}/movimientos/${id}`,
      data
    );
  }

  // Aportar (ahorro) a un objetivo
  aportarAObjetivo(id: string, data: {
    monto: number;
    estrategia: 'mantener_plazo' | 'ajustar_plazo' | 'recuperar_en_x_meses';
    recuperarEnMeses?: number;
    participante?: string;
    redistribucion?: number; // 🆕 agregado
  }) {
    return this.http.post(`/api/v1/users/me/objetivos/${id}/aportar`, data);

  }


  // 🧪 OPCIONAL: Preview del plan antes de confirmar (si implementas el endpoint)
  // Backend: POST /api/v1/users/me/objetivos/:id/plan/preview
  previewPlan(
    objetivoId: string,
    payload: {
      montoAportar: number;
      estrategia: 'mantener_plazo' | 'ajustar_plazo' | 'recuperar_en_x_meses';
      recuperarEnMeses?: number;
    }
  ): Observable<{
    ok: boolean;
    aporteEsperadoMes: number;
    aporteAcumuladoMes: number;
    delta: number;
    nuevaCuotaRecomendada: number;
    nuevoMesesObjetivo: number;
    nuevoPlazoEstimadoMeses: number;
    fechaFinEstimada: string;
  }> {
    return this.http.post<{
      ok: boolean;
      aporteEsperadoMes: number;
      aporteAcumuladoMes: number;
      delta: number;
      nuevaCuotaRecomendada: number;
      nuevoMesesObjetivo: number;
      nuevoPlazoEstimadoMeses: number;
      fechaFinEstimada: string;
    }>(`${this.baseUrl}/objetivos/${objetivoId}/plan/preview`, payload);
  }

  
recalcularPlanObjetivo(id: string) {
  return this.http.post<{ ok: boolean; plan: any; cuotaRecomendada: number }>(
    `${this.baseUrl}/objetivos/${id}/recalcular`,
    {}
  );
}

  
// Eliminar un objetivo
deleteObjetivo(id: string): Observable<{ ok: boolean; message: string }> {
  return this.http.delete<{ ok: boolean; message: string }>(
    `${this.baseUrl}/objetivos/${id}`
  );
}

  // Historial de aportes del objetivo
  getHistorialAhorros(objetivoId: string): Observable<{ ok: boolean; items: any[] }> {
    return this.http.get<{ ok: boolean; items: any[] }>(
      `${this.baseUrl}/objetivos/${objetivoId}/ahorros`
    );
  }

}
