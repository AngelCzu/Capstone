import { inject, Injectable } from '@angular/core';
import { Auth,  UserCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signOut } from '@angular/fire/auth';
import { User } from '../models/user.model';
import { fetchSignInMethodsForEmail, linkWithCredential, linkWithPopup, onAuthStateChanged } from 'firebase/auth';
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
  async signInGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    try {
      // Intento normal
      const result = await signInWithPopup(this.auth, provider);
      return result;

    } catch (error: any) {
      console.warn('⚠️ Google Sign-In error:', error);

      // Caso: la cuenta ya existe con otro proveedor (password)
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        const pendingCred = GoogleAuthProvider.credentialFromError(error);

        if (email && pendingCred) {
          const methods = await fetchSignInMethodsForEmail(this.auth, email);

          if (methods.includes('password')) {
            // 🔑 Pedir contraseña al usuario
            const pass = prompt(`Tu cuenta ${email} ya existe. Ingresá tu contraseña para vincular con Google:`);

            if (!pass) throw new Error('Operación cancelada');

            // Iniciar sesión con email/password
            const emailUser = await signInWithEmailAndPassword(this.auth, email, pass);

            // 🔗 Vincular credencial Google a la cuenta existente
            const linked = await linkWithCredential(emailUser.user, pendingCred);
            console.log('✅ Cuentas fusionadas correctamente:', linked.user);

            await this.utilsSvc.presentToast({
              message: 'Cuenta Google vinculada correctamente',
              color: 'success',
              duration: 2000,
              position: 'bottom'
            });

            return linked;
          } else {
            throw new Error('La cuenta ya existe con otro método no compatible.');
          }
        }
      }

      throw error;
    }
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
