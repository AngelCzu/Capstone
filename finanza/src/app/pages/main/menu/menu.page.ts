import { Component, Input, OnInit } from '@angular/core';
import { SharedModule } from 'src/app/shared/shared-module';
import { Router } from '@angular/router';


@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  imports: [SharedModule]
})
export class MenuPage implements OnInit {
  @Input() title!: string;
  @Input() profile!: string;
  backButton = '/ruta/deseada'; // Ajusta la ruta según tu necesidad

  constructor(private router: Router) { }

  ngOnInit() {
  }
  goToProfile() {
      this.router.navigate(['/main/profile']);
    }
}
