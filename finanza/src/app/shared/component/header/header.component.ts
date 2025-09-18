import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false,
})
export class HeaderComponent  implements OnInit {


  @Input() title!: string;
  @Input() badge!: string;
  @Input() backButton!: string;
  @Input() notifications!: string;
  @Input() profile!: string;
  @Input() Menu!: string;

  constructor(private router: Router) { }

  ngOnInit() {}

    goToProfile() {
      this.router.navigate(['/main/profile']);
    }

    goToMenu() {
      this.router.navigate(['/main/menu']);
    }

}
