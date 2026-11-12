export interface UserResponse {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  email: string;
  dni: string | null;
  activo: boolean;
  rol: string;
}
