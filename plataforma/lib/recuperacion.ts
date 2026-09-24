import { isAdmin } from "./admin";

// Qué hacer cuando alguien pide recuperar el acceso al panel del equipo.
//
// El panel no tenía recuperación: las contraseñas se asignaban a mano y quien
// no la recordaba quedaba varado. Peor: las creadoras llegaban ahí con su
// correo personal y leían "contraseña incorrecta", sin entender que ese panel
// no es para ellas.

export type Recuperacion =
  | { tipo: "enviar"; email: string }
  | { tipo: "no-es-equipo" }
  | { tipo: "correo-invalido" };

export function decidirRecuperacion(entrada: string | null | undefined): Recuperacion {
  const email = (entrada ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { tipo: "correo-invalido" };
  // No se finge un envío que no ocurrió: si no es del equipo, se le dice y se
  // le muestra dónde entra de verdad.
  if (!isAdmin(email)) return { tipo: "no-es-equipo" };
  return { tipo: "enviar", email };
}
