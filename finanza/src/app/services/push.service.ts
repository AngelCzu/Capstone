import { Injectable, inject } from '@angular/core';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { environment } from 'src/environments/environment';
import { UserApi } from './user.api';
import { firstValueFrom } from 'rxjs';

@Injectable({ 
  providedIn: 'root' ,
}) 
export class PushService {
  private messaging = inject(Messaging);
  private userApi = inject(UserApi);

async init() {
  
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn("Permiso de notificaciones no concedido");
      return;
    }
    console.log("iniciando el push.services");
    
    const token = await getToken(this.messaging, {
      vapidKey: environment.vapidKey, // Obtain this from Firebase Cloud Messaging settings
    });

    console.log("Token generado:", token);

    if (token) {
      await firstValueFrom(this.userApi.registerFcmToken(token));
      console.log('Token registrado en backend');
    }
  } catch (err) {
    console.error("Detalle FCM:", err);
  }
}

}
