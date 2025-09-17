import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './component/header/header.component';
import { CustomInputComponent } from './component/custom-input/custom-input.component';
import { LogoComponent } from './component/logo/logo.component';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StorageBarComponent } from './component/storage-bar/storage-bar.component';
import { NavbarComponent } from './component/navbar/navbar.component';
import { ConfirmDialogComponent } from './component/confirm-dialog/confirm-dialog.component';



@NgModule({
  declarations: [
    HeaderComponent,
    CustomInputComponent,
    LogoComponent,
    StorageBarComponent,
    NavbarComponent,
    ConfirmDialogComponent,
  ],
  exports: [
    HeaderComponent,
    CustomInputComponent,
    LogoComponent,
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    RouterLink,
    StorageBarComponent,
    NavbarComponent,
    ConfirmDialogComponent
     
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    
    
  ]
})
export class SharedModule { }
