import { inject, Injectable } from '@angular/core';
import { Auth,  UserCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signOut } from '@angular/fire/auth';
import { User } from '../models/user.model';
import { onAuthStateChanged } from 'firebase/auth';
import { Firestore, getFirestore, setDoc, doc, getDoc } from '@angular/fire/firestore';
import { Utils } from './utils';





@Injectable({
  providedIn: 'root'
})
export class Firebase {
  auth = inject(Auth);
  firestore = inject(Firestore);
  utilsSvc = inject(Utils);


  // ================================ Autenticación ================================




  //======= Iniciar sesión con correo y contraseña =======
  signIn(user: User) {
    return signInWithEmailAndPassword(this.auth, user.email, user.password);
  }


  //======= Registrar usuario =======
  signUp(user: User) : Promise<UserCredential> {
    
    return createUserWithEmailAndPassword(this.auth, user.email, user.password);
    
  }

  //======= Actualizar datos del usuario =======
  updateUser(displayName: string) {
    return updateProfile(this.auth.currentUser, { displayName });
  } 


  //======= Enviar correo de recuperación de contraseña =======
  sendRecoverEmail(email: string) {
    return sendPasswordResetEmail(this.auth, email);  }


  //======= Iniciar sesión Google =======  
  signInGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    return signInWithPopup(this.auth, provider);
  }


   //======= Cerrar sesión y esperar =======
  async signOutAndWait(): Promise<void> {
    const waitForNull = new Promise<void>((resolve) => {
      const unsub = onAuthStateChanged(this.auth, (user) => {
        if (!user) {
          unsub();
          resolve();
        }
      });
    });

    await signOut(this.auth);
    await waitForNull;
  }

  async signOut() {
    await signOut(this.auth);
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
