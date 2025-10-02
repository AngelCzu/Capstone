import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-confirm-sheet',
  templateUrl: './confirm-sheet.component.html',
  styleUrls: ['./confirm-sheet.component.scss'],
  standalone: false
})
export class ConfirmSheetComponent {
  @Input() title!: string;
  @Input() message!: string;
  @Input() confirmText: string = 'Aceptar';
  @Input() cancelText: string = 'Cancelar';
  @Input() color: string = 'primary';
  @Input() icon: string = 'alert-circle-outline';

  constructor(private modalCtrl: ModalController) {}

  cancel() {
    this.modalCtrl.dismiss(false);
  }

  confirm() {
    this.modalCtrl.dismiss(true);
  }
}
