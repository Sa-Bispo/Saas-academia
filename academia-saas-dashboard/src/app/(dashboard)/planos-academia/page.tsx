import { listarPlanosAcademia } from "@/actions/planos-academia.actions";
import { PlanosAcademiaClient } from "./planos-academia-client";

export default async function PlanosAcademiaPage() {
  const planos = await listarPlanosAcademia();
  return <PlanosAcademiaClient planos={planos} />;
}
