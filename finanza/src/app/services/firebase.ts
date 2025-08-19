import { inject, Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { User } from '../models/user.model';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { getFirestore, setDoc, doc } from '@angular/fire/firestore';





@Injectable({
  providedIn: 'root'
})
export class Firebase {
  auth = inject(AngularFireAuth);
  firestore = inject(AngularFirestore);



  // ================================ Autenticación ================================


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


  // ======= Base de Datos Firebase =======
  setDocument(path: string, data: any) {
    return setDoc(doc(getFirestore(), path), data);
  }
}
