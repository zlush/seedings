import { redirect } from "next/navigation";

// El creador ya no postula: el equipo lo habilita a las campañas.
export default function CampanasRedirect() {
  redirect("/campana");
}
