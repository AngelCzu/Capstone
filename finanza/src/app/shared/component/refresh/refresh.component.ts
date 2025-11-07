import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';

@Component({
  selector: 'app-refresh',
  templateUrl: './refresh.component.html',
  styleUrls: ['./refresh.component.scss'],
  standalone: false,
})
export class RefreshComponent {
  @Output() refresh = new EventEmitter<RefresherCustomEvent>();

  // Completa automáticamente si el padre no maneja el complete
  @Input() autoComplete = true;
  @Input() autoCompleteDelay = 600; // ms

  handleRefresh(event: RefresherCustomEvent) {
    this.refresh.emit(event);

    if (this.autoComplete) {
      setTimeout(() => {
        try {
          event.target.complete();
        } catch {}
      }, this.autoCompleteDelay);
    }
  }
}

