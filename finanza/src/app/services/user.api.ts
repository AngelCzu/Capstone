import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';


@Injectable({
  providedIn: 'root'
})
export class UserApi {
  constructor(private http: HttpClient) {}

  getMe() {
    return this.http.get<User>('/api/v1/users/me');
  }

  patchMe(patch: Partial<User>) {
    return this.http.patch<{ ok: boolean }>('/api/v1/users/me', patch);
  }
}
