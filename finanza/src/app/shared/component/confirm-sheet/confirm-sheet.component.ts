
import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { IonButton, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/angular/standalone';
@Component({
  selector: 'app-confirm-sheet',
  templateUrl: './confirm-sheet.component.html',
  styleUrls: ['./confirm-sheet.component.scss'],
  standalone: false,
  imports: [IonButton, IonContent, IonHeader, IonModal, IonTitle, IonToolbar]
  
})
export class ConfirmSheetComponent {
  @Input() title: string = 'Confirmar';
  @Input() message: string = '¿Estás seguro?';
  @Input() confirmText: string = 'Aceptar';
  @Input() cancelText: string = 'Cancelar';
  @Input() icon: string = 'alert-circle-outline'; // ícono configurable
  @Input() color: string = 'danger'; // color del botón confirmar

  constructor(private modalCtrl: ModalController) {}

  confirm() {
    this.modalCtrl.dismiss(true);
  }

  cancel() {
    this.modalCtrl.dismiss(false);
  }
}