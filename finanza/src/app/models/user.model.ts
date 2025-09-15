export interface User {
  uid: string;
  email: string;
  password: string;
  name: string;
  lastName: string;
  premium: boolean;
  photo?: string;
}

// Modelo seguro (lo que de verdad muestras en el front)
export type UserProfile = Omit<User, 'uid' | 'password'>;