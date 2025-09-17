import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  standalone: false
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirmar';
  @Input() message = '¿Estás seguro?';
  @Input() confirmText = 'Aceptar';
  @Input() cancelText = 'Cancelar';

  constructor(private modalCtrl: ModalController) {}

  confirm() {
    this.modalCtrl.dismiss(true);
  }

  cancel() {
    this.modalCtrl.dismiss(false);
  }
}
