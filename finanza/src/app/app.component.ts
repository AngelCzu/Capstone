import { Component, inject, NgZone, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { MenuController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Utils } from './services/utils';
import { PushService } from './services/push.service';
import { IndicadoresService } from './services/indicadores.service';
import { UserApi } from './services/apis/user.api';
import { User } from './models/user.model';
import { Firebase } from './services/firebase';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private readonly usersMeUrl = `${environment.apiUrl}/users/me`;
  // 🔹 Inyección de dependencias (como ya lo tienes)
  private auth      = inject(Auth);
  private injector  = inject(Injector);
  private ngZone    = inject(NgZone);
  private router    = inject(Router);
  private menuCtrl  = inject(MenuController);

  utilsSvc          = inject(Utils);
  pushService       = inject(PushService);
  indicadoresSvc    = inject(IndicadoresService);
  userApi           = inject(UserApi);
  firebaseSvc       = inject(Firebase);
  http              = inject(HttpClient)

  // 🔹 Datos del usuario para el menú lateral
  user: Partial<User> = {};
  
  

  constructor() {}

  ngOnInit(): void {
    
    // Cargar datos locales del usuario (si existen)
    this.loadUserFromLocalStorage();
    

    // Escuchar cambios de localStorage o eventos globales
    window.addEventListener('userDataUpdated', () => this.loadUserFromLocalStorage());
    window.addEventListener('storage', () => this.loadUserFromLocalStorage());

    // Ejecutar la lógica de authState dentro del contexto de inyección
    runInInjectionContext(this.injector, () => {
      authState(this.auth).subscribe(async (user) => {
        this.ngZone.run(async () => {
          if (user) {
            await user.getIdToken(true);
            await this.indicadoresSvc.getUF();
            await this.userApi.obtenerDatosCompletosUsuario();
            this.pushService.init();
            console.log('[APP] Sesión restaurada');

            // 🔹 Actualizar menú cuando se restaura sesión
            this.loadUserFromLocalStorage();
          } else {
            console.log('[APP] No hay sesión activa');
            this.utilsSvc.routerLink('/login');
          }
        });
      });
    });
  }

  // ====================================================
  // 🧠 Métodos del menú lateral
  // ====================================================

  /** Cargar los datos del usuario desde localStorage */
  loadUserFromLocalStorage() {
  try {
    const stored = localStorage.getItem('userData');

    if (stored) {
      const parsed = JSON.parse(stored);

      // ✅ Estructura base si faltan datos
      this.user = {
        name: parsed.name || 'Usuario',
        lastName: parsed.lastName || '',
        email: parsed.email || 'usuario@email.com',
        photoURL: parsed.photoURL || '',
      };

    } else {
      // ⚠️ Si no hay userData guardado
      this.user = {
        name: 'Usuario',
        lastName: '',
        email: 'usuario@email.com',
        photoURL: 'assets/icon/favicon.png',
      };
    }

  } catch (err) {
    console.error('❌ Error cargando userData:', err);
    this.user = {
      name: 'Usuario',
      lastName: '',
      email: 'usuario@email.com',
      photoURL: 'assets/icon/favicon.png',
    };
  }
}


  getInitials(name?: string, lastName?: string): string {
    return (name?.[0] || '') + (lastName?.[0] || '');
  }


  // Navegar al perfil
  async goToProfile() {
    await this.menuCtrl.close();
    this.router.navigate(['/main/profile']);
  }

    async goToHome() {
    await this.menuCtrl.close();
    this.router.navigate(['/main/home']);
  }

  async goToMov() {
    await this.menuCtrl.close();
    this.router.navigate(['/main/historico']);
  }

  async goToCat() {
    await this.menuCtrl.close();
    this.router.navigate(['/main/categorias']);
  }

  async goToConfig() {
    await this.menuCtrl.close();
    this.router.navigate(['/main/settings']);
  }

  /** Cerrar sesión: limpia storage y redirige */
async signOutConfirm(): Promise<void> {
  const confirmed = await this.utilsSvc.presentConfirmSheet({
  title: 'Cerrar Sesión',
  message: '¿Seguro que deseas cerrar sesión?',
  confirmText: 'Cerrar Sesión',
  cancelText: 'Cancelar',
  color: 'danger',
  icon: 'alert-circle-outline'
});

  if (!confirmed) return;

   const loading = await this.utilsSvc.loading();
   loading.present();
  try {
    // Revocar en el backend
    //await firstValueFrom(this.http.post('/api/v1/users/me/revoke', {}));

    // Cerrar sesión en Firebase
    await this.firebaseSvc.signOutAndWait();
    await this.menuCtrl.close();

    // Limpiar storage local
    localStorage.removeItem('userData'); 
    sessionStorage.clear();


  } catch (error) {
    this.utilsSvc.presentToast({
      message: 'Error cerrando sesión',
      color: 'danger',
      position: "bottom",
      duration: 1500
    });
    loading.dismiss();  
  } finally {
   // Cierra el loading antes del redirect
    await loading.dismiss();

    
  }
}

// Borrar cuenta
async deleteAccountConfirm(): Promise<void> {
  const confirmed = await this.utilsSvc.presentConfirmSheet({
  title: 'Eliminar Cuenta',
  message: '¿Seguro que deseas eliminar tú cuenta? \n Sí la eliminas perderás permanentemente toda información',
  confirmText: 'Eliminar Cuenta',
  cancelText: 'Cancelar',
  color: 'danger',
  icon: 'alert-circle-outline'
});

  if (!confirmed) return;

   const loading = await this.utilsSvc.loading();
   loading.present();
   console.log(this.user.email);
   
  try {
    
      await firstValueFrom(this.http.post(`${this.usersMeUrl}/pin/request`, {
        action: 'delete-account'
      }));
      loading.dismiss();
      // 👇 Usamos utilsSvc en vez de crear modal aquí
      const pin = await this.utilsSvc.presentPinSheet({
        email: this.user.email,
        action: 'delete-account',
        title: 'Eliminar cuenta',
        message: 'Introduce el código de 6 dígitos que enviamos a tu correo para confirma la eliminación de la cuenta /n',
        ttlSec: 300, // 5 minutos para que caduque el PIN
        
      });
      await this.menuCtrl.close();
      // Limpiar storage local
      localStorage.removeItem('userData'); 
      localStorage.removeItem('userCategorias'); 
      localStorage.removeItem('userSettings'); 
      sessionStorage.clear();

    


  } catch (error) {
    this.utilsSvc.presentToast({
      message: error.message || 'Error al borrar la cuenta',
      color: 'danger',
      position: "bottom",
      duration: 1500
    });
    loading.dismiss();  
  } finally {
   // Cierra el loading antes del redirect
    await loading.dismiss();

    
  }
}
}
