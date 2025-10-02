export interface User {
  uid: string;
  email: string;
  password: string;
  name: string;
  lastName: string;
  premium: boolean;
  photoURL?: string;

  // NUEVO (persisten con la cuenta)
  settings?: {
    recordatoriosGastos?: boolean; // default: true
    recordatoriosPagos?: boolean;  // default: true
  };

  fcmTokens?: string[]; // lista de tokens activos por dispositivo

}

// Modelo seguro (lo que de verdad muestras en el front)
export type UserProfile = Omit<User, 'uid' | 'password'>;