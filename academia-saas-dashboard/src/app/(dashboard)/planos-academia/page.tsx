import { listarPlanosAcademia } from "@/actions/planos-academia.actions";
import { PlanosAcademiaClient } from "./planos-academia-client";

export default async function PlanosAcademiaPage() {
  try {
    const planos = await listarPlanosAcademia();
    return <PlanosAcademiaClient planos={planos} />;
  } catch {
    return <PlanosAcademiaClient planos={[]} />;
  }
}
