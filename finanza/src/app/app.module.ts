import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router'; 
import { IonicModule, IonicRouteStrategy } from '@ionic/angular'; 
import { AppComponent } from './app.component'; 
import { AppRoutingModule } from './app-routing.module';


// Firebase imports 
import { AngularFireModule } from '@angular/fire/compat'; 
import { environment } from 'src/environments/environment'; 



// Importaciones de Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app'; 
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { provideAuth, getAuth } from '@angular/fire/auth'; 
import { provideFirestore, getFirestore } from '@angular/fire/firestore'; 
import { provideStorage, getStorage } from '@angular/fire/storage'; 
import { HTTP_INTERCEPTORS, HttpClientModule, } 

from '@angular/common/http'; import { AuthTokenInterceptor } 
from 'src/app/services/auth-token.interceptor'; 
@NgModule({ 
  declarations: [AppComponent], 
  imports: [ 
    BrowserModule, 
    IonicModule.forRoot({ mode: 'md'/*esto es para dejarlo del mismo diseño para todos los celulares */ }), 
    AppRoutingModule,
    
    
    // Firebase module initialization 
    AngularFireModule.initializeApp(environment.firebaseConfig), 


    //HttpClientModule hace HTTP requests 
    HttpClientModule 
  ],
     providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy}, 
      
                // Interceptor para agregar token a las peticiones HTTP 
                {provide: HTTP_INTERCEPTORS,useClass: AuthTokenInterceptor, multi: true},

                 // Modular Firebase API (recomendado) 
                 provideFirebaseApp(() => initializeApp(environment.firebaseConfig)), 
                 provideAuth(() => getAuth()), 
                 provideFirestore(() => getFirestore()), 
                 provideStorage(() => getStorage()), 
                 provideMessaging(() => getMessaging()),
    ], 
    bootstrap: [AppComponent], 
  }) 
  
  
  export class AppModule { }