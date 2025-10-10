import { inject, Injectable } from '@angular/core';
import { Objetivo } from 'src/app/models/objetivo.model';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ObjetivoApi {

  firestore = inject(AngularFirestore);


  private objetivosCollection = this.firestore.collection<Objetivo>('objetivos');



  constructor() {}


  
  // Obtener todos los objetivos del usuario
  getObjetivos(): Observable<Objetivo[]> {
    return this.objetivosCollection.valueChanges({ idField: 'id' });
  }


  // Crear un nuevo objetivo
  crearObjetivo(objetivo: Objetivo): Promise<void> {
    const objetivoRef = this.objetivosCollection.doc(objetivo.id);
    return objetivoRef.set({ ...objetivo });
  }

  // Actualizar un objetivo
  actualizarObjetivo(objetivo: Objetivo): Promise<void> {
    const objetivoRef = this.objetivosCollection.doc(objetivo.id);
    return objetivoRef.update({ ...objetivo });
  }

  // Eliminar un objetivo
  eliminarObjetivo(id: string): Promise<void> {
    const objetivoRef = this.objetivosCollection.doc(id);
    return objetivoRef.delete();
  }
  
}
