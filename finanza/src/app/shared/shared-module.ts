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
import { ConfirmSheetComponent } from './component/confirm-sheet/confirm-sheet.component';
import { EmailPinModalComponent } from './component/email-pin-modal/email-pin-modal.component';
import { VisualCurrencyDirective } from '../directives/visual-currency.directive';
import { CustomCurrencyInputComponent } from './component/custom-currency-input/custom-currency-input.component';




@NgModule({
  declarations: [
    HeaderComponent,
    CustomInputComponent,
    LogoComponent,
    StorageBarComponent,
    NavbarComponent,
    ConfirmSheetComponent,
    EmailPinModalComponent,
    VisualCurrencyDirective,
    CustomCurrencyInputComponent 

  ],
  exports: [
    HeaderComponent,
    CustomInputComponent,
    CustomCurrencyInputComponent ,
    LogoComponent,
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    RouterLink,
    StorageBarComponent,
    NavbarComponent,
    ConfirmSheetComponent,
    EmailPinModalComponent,
    VisualCurrencyDirective,


     
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
