import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';



// Firebase imports
import { AngularFireModule } from '@angular/fire/compat';
import { environment } from 'src/environments/environment';

import { HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';
import { authTokenInterceptor } from 'src/app/services/auth-token.interceptor';
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot({ mode: 'md'/*esto es para dejarlo del mismo diseño para todos los celulares */ }),
    AppRoutingModule,

    // Firebase module initialization
    AngularFireModule.initializeApp(environment.firebaseConfig), // Initialize Firebase with the config


    // HttpClientModule hace HTTP requests
    HttpClientModule
    
  ],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy}, provideHttpClient(withInterceptors([authTokenInterceptor]))
  ],
  bootstrap: [AppComponent],
})

export class AppModule { }
