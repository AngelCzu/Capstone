import { Component, OnInit } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared-module';


@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
  imports: [SharedModule, FormsModule]
})
export class MainPage implements OnInit {

  constructor(


  ) { }

  ngOnInit() {
  }

  onRefresh(event: RefresherCustomEvent) {
    try { event.target.complete(); } catch {}
  }

}
