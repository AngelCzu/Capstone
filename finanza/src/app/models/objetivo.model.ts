export interface Objetivo {
  id: string;
  nombre: string;
  tipo: string;                 // Vacaciones, Estudio, etc.
  icono: string;                // Emoji o nombre del icono
  montoMeta: number;            // Monto total
  montoActual: number;          // Monto ahorrado
  fechaCreacion: any;           // Fecha de creación (Firestore Timestamp)
  fechaLimite?: any;            // Fecha límite (opcional)
}
