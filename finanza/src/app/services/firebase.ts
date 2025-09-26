import { inject, Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getAuth, UserCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,  } from 'firebase/auth';
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
  signUp(user: User) : Promise<UserCredential> {
    
    return createUserWithEmailAndPassword(getAuth(), user.email, user.password);
    
  }

  //======= Actualizar datos del usuario =======
  updateUser(displayName: string) {
    return updateProfile(getAuth().currentUser, { displayName });
  } 


  //======= Enviar correo de recuperación de contraseña =======
  sendRecoverEmail(email: string) {
    return sendPasswordResetEmail(getAuth(), email);  }


  //======= Iniciar sesión Google =======  
  signInGoogle() {
    return signInWithPopup(getAuth(), new GoogleAuthProvider());
  }


  //======= Cerrar sesión =======
 async signOutAndWait(): Promise<void> {
    const waitForNull = new Promise<void>((resolve) => {
      const unsub = onAuthStateChanged(getAuth(), (user) => {
        if (!user) {
          unsub();
          resolve();
        }
      });
    });

    await signOut(getAuth()); // dispara onAuthStateChanged(null)
    await waitForNull;        // esperamos confirmación
  }

  async signOut(){
  await signOut(getAuth())
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
