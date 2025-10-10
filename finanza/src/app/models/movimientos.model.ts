export interface Ingreso {
  nombre: string;
  monto: number;
  origen: string;  // Campo nuevo
  createdAt: Date;
}

export interface Gasto {
  nombre: string;
  monto: number;
  compartido: boolean;
  participantes: { nombre: string, porcentaje: number }[];
  createdAt: Date;
}

export interface Deuda {
  nombre: string;
  monto: number;
  cuotas: number;
  participantes: { nombre: string, porcentaje: number }[];
  compartido: boolean;
  createdAt: Date;
}

export interface Objetivo {
  nombre: string;
  monto: number;
  tiempo: number;  // En meses
  icono: string;  // Nombre del archivo o URL de la imagen
  creadoEn: Date;
  compartido: boolean;
  participantes: { nombre: string, porcentaje: number }[];
}
