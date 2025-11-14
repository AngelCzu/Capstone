import { Component, OnInit, inject } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared-module';
import { Utils } from 'src/app/services/utils';
import { UserApi } from 'src/app/services/apis/user.api';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class SettingsPage implements OnInit {
  private userApi = inject(UserApi);
  utilsSvc = inject(Utils);

  form = new FormGroup({
    settings: new FormGroup({
      recordatoriosGastos: new FormControl(false),
      recordatoriosPagos: new FormControl(false),
    }),
  });

  ngOnInit() {
    this.loadSettings();
  }

  // ==================== CARGAR AJUSTES ====================
  loadSettings() {
    const storedSettings = localStorage.getItem('userSettings');

    let settings = {
      recordatoriosGastos: true,
      recordatoriosPagos: true,
    };

    if (storedSettings) {
      try {
        settings = JSON.parse(storedSettings);
      } catch (err) {
        console.warn('⚠️ Error parseando userSettings, usando valores por defecto', err);
      }
    } else {
      localStorage.setItem('userSettings', JSON.stringify(settings));
    }

    this.form.patchValue({
      settings: {
        recordatoriosGastos: !!settings.recordatoriosGastos,
        recordatoriosPagos: !!settings.recordatoriosPagos,
      },
    });

    console.log('⚙️ Ajustes cargados desde localStorage:', settings);
  }

  // ==================== CAMBIO DE TOGGLE ====================
  async onToggleChange(key: 'recordatoriosGastos' | 'recordatoriosPagos', value: boolean) {
    try {
      // 🔹 1️⃣ Preparamos objeto actualizado para enviar al backend
      const storedSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      const updatedSettings = { ...storedSettings, [key]: value };

      // 🔹 2️⃣ Llamamos al backend
      const loading = await this.utilsSvc.loading();
      await loading.present();

      await firstValueFrom(this.userApi.updateProfile({ settings: updatedSettings }));

      // 🔹 3️⃣ Si tuvo éxito → actualizamos localStorage
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings));

      console.log('💾 Ajustes sincronizados correctamente:', updatedSettings);

      await loading.dismiss();
      this.utilsSvc.presentToast({
        message: 'Ajuste actualizado',
        color: 'success',
        duration: 1000,
        position: 'bottom',
      });
    } catch (err) {
      console.error('❌ Error al guardar configuración:', err);

      // 🔹 4️⃣ Revertimos visualmente el toggle (sin tocar storage)
      const previousValue = !value;
      this.form.get(['settings', key])?.setValue(previousValue, { emitEvent: false });

      this.utilsSvc.presentToast({
        message: 'No se pudo guardar el cambio',
        color: 'danger',
        duration: 1500,
        position: 'bottom',
      });
    }
  }

  onRefresh(event: RefresherCustomEvent) {
    try {
      this.loadSettings();
    } finally {
      try { event.target.complete(); } catch {}
    }
  }
}
