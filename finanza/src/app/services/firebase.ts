import { inject, Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { User } from '../models/user.model';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { getFirestore, setDoc, doc, getDoc} from '@angular/fire/firestore';
import { Utils } from './utils';





@Injectable({
  providedIn: 'root'
})
export class Firebase {
  auth = inject(AngularFireAuth);
  firestore = inject(AngularFirestore);
  utilsSvc = inject(Utils);


  // ================================ Autenticación ================================

  getAuth() {
    return getAuth();
  }



  //======= Iniciar sesión con correo y contraseña =======
  signIn(user: User) {
    return signInWithEmailAndPassword(getAuth(), user.email, user.password);
  }


  //======= Registrar usuario =======
  signUp(user: User) {
    return createUserWithEmailAndPassword(getAuth(), user.email, user.password);
  }

  //======= Actualizar datos del usuario =======
  updateUser(displayName: string) {
    return updateProfile(getAuth().currentUser, { displayName });
  } 

  sendRecoverEmail(email: string) {
    return sendPasswordResetEmail(getAuth(), email);  }



  //======= Cerrar sesión =======
  signOut() { 
    getAuth().signOut();
    localStorage.removeItem('user'); // Limpiar el almacenamiento local
    this.utilsSvc.routerLink('/login'); // Redirigir al usuario a la página de inicio de sesión
  }







  // ================================= Base de Datos Firebase ========================

  //======= Guardar documento =======
  setDocument(path: string, data: any) {
    return setDoc(doc(getFirestore(), path), data);
  }

  //======= Obtener documento =======
   async getDocument(path: string) {
    return (await getDoc(doc(getFirestore(), path))).data();  
  }
}
