import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../../models/user.model';
import { Observable, firstValueFrom  } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserApi {
  constructor(private http: HttpClient) {}
  private baseUrl = '/api/v1/users/me';


//============================================= PERFIL  ============================================================//

  // Crear perfil de usuario
  createUser(data: Partial<User>) {
    return this.http.post<{ ok: boolean; message: string }>(this.baseUrl, data);
  }


  // Obtener perfil del usuario
  getMe():  Observable<User> {
    return this.http.get<User>(this.baseUrl);
  }

 // Actualizar perfil del usuario
  updateProfile(data: Partial<User>): Observable<User> {
    return this.http.patch<User>(this.baseUrl, data);
  }

  // Subir foto de perfil
  uploadProfilePhoto(data: FormData) {
  return this.http.post<{ photoURL: string }>(`${this.baseUrl}/photo`, data);
  }

  // Registrar token FCM
  registerFcmToken(token: string) {
    return this.http.post<{ ok: boolean }>(`${this.baseUrl}/fcm-token`, { token });
  }

  // Eliminar token FCM
  unregisterFcmToken(token: string) {
    return this.http.request<{ ok: boolean }>('DELETE', `${this.baseUrl}/fcm-token`, {
      body: { token }
    });
  }

// ========================================================== CATEGORIAS =========================================================

  //======= Obtener Categorias por tipo=======
  obtenerCategorias(tipo: string): Observable<{ ok: boolean; categorias: any[] }> {
    return this.http.get<{ ok: boolean; categorias: any[] }>(
      `${this.baseUrl}/categorias?tipo=${tipo}`
    );
  }

  // ======= Obtener todas las Categorías =======
  obtenerTodasCategorias(): Observable<{ ok: boolean; categorias: any[] }> {
    return this.http.get<{ ok: boolean; categorias: any[] }>(
      `${this.baseUrl}/categorias`
    );
  }


  //======= Agregar Categorias =======  
  agregarCategoria(data: any): Observable<{ ok: boolean; id: string }> {
    return this.http.post<{ ok: boolean; id: string }>(`${this.baseUrl}/categorias`, data);
  }


  // ======= Actualizar Categoría =======
  actualizarCategoria(catId: string, data: any): Observable<{ ok: boolean; mensaje?: string }> {
    return this.http.patch<{ ok: boolean; mensaje?: string }>(
      `${this.baseUrl}/categorias/${catId}`,
      data
    );
  }

// ======== Eliminar Categoría ========
eliminarCategoria(id: string): Observable<{ ok: boolean; message: string }> {
  return this.http.delete<{ ok: boolean; message: string }>(
    `${this.baseUrl}/categorias/${id}`
  );
}




// ========================================================== OBTENER TODO =========================================================

async obtenerDatosCompletosUsuario() {
  try {
    // 1️⃣ Obtener perfil
    const perfil = await firstValueFrom(this.getMe());

    // 2️⃣ Obtener categorías por tipo
    const movCats = await firstValueFrom(this.obtenerCategorias('movimiento'));
    const objCats = await firstValueFrom(this.obtenerCategorias('objetivo'));

    // 3️⃣ Combinar categorías
    const categorias = [...movCats.categorias, ...objCats.categorias];

    // 4️⃣ Separar el perfil y settings
    const { settings = {}, ...perfilSinSettings } = perfil;

    localStorage.removeItem('userData'); 
    localStorage.removeItem('userSettings'); 
    localStorage.removeItem('userCategorias'); 

    // 5️⃣ Guardar por separado en localStorage
    localStorage.setItem('userData', JSON.stringify(perfilSinSettings));
    localStorage.setItem('userSettings', JSON.stringify(settings));
    localStorage.setItem('userCategorias', JSON.stringify(categorias));


    // 6️⃣ Retornar los tres objetos combinados
    return { ...perfilSinSettings, settings, categorias };

  } catch (error) {
    console.error('❌ Error obteniendo datos del usuario:', error);
    throw error;
  }
}


// ========================================================== NOTIFICACIONES =========================================================

  // Notificación de prueba
  sendTestPush() {
    return this.http.post<{ ok: boolean; success: number; failure: number }>(
      `${this.baseUrl}/push-test`,
      {}
    );
  }



  // ========================================================== RESUMEN MENSUAL =========================================================

getResumenMensual() {
  return this.http.get<{
    ok: boolean;
    ingresos: number;
    gastos: number;
    deudas: number;
    restante: number;
    porCategoria?: { nombre: string; monto: number; color: string }[];
  }>(`${this.baseUrl}/resumen`);
}



obtenerPorCategoria(categoria: string) {
  return this.http.get<any[]>(`${this.baseUrl}/movimientos?categoria=${encodeURIComponent(categoria)}`);
}


}




