import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IndicadoresService {

  private cacheKey = 'valorUF_cache';

  // Obtener el valor UF (usa cache diario)
  async getUF(): Promise<number> {
    const hoy = new Date().toISOString().split('T')[0];
    const cached = localStorage.getItem(this.cacheKey);

    // ✅ Si ya está guardado y es del mismo día, lo usamos
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.fecha === hoy && parsed.valor) return parsed.valor;
    }

    // 🚀 Si no hay cache, lo pedimos a la API una sola vez
    try {
      const res = await fetch('https://mindicador.cl/api/uf');
      const data = await res.json();
      const valor = data.serie[0].valor;

      localStorage.setItem(this.cacheKey, JSON.stringify({
        valor,
        fecha: hoy
      }));

      console.log('💾 UF actualizada:', valor);
      return valor;
    } catch (error) {
      console.warn('⚠️ No se pudo obtener UF, usando fallback');
      return 37000; // valor de emergencia si la API falla
    }
  }
}
