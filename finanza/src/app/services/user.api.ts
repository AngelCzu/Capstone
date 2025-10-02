import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserApi {
  constructor(private http: HttpClient) {}
  private baseUrl = '/api/v1/users/me';

  // Obtener perfil del usuario
  getMe() {
    return this.http.get<User>(this.baseUrl);
  }

 // Actualizar perfil del usuario
  updateProfile(data: Partial<User>): Observable<User> {
    return this.http.patch<User>(this.baseUrl, data);
  }

  
  // Subir foto de perfil
  uploadProfilePhoto(data: FormData) {
  return this.http.post<{ photoURL: string }>('/api/v1/users/me/photo', data);
  }

  // Registrar token FCM
  registerFcmToken(token: string) {
    return this.http.post<{ ok: boolean }>('/api/v1/users/me/fcm-token', { token });
  }

  // Eliminar token FCM
  unregisterFcmToken(token: string) {
    return this.http.request<{ ok: boolean }>('DELETE', '/api/v1/users/me/fcm-token', {
      body: { token }
    });
  }

  // Notificación de prueba
  sendTestPush() {
    return this.http.post<{ ok: boolean; success: number; failure: number }>(
      '/api/v1/users/me/push-test',
      {}
    );
  }




}
