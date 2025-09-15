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
}
