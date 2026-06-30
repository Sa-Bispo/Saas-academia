import { listarFuncionarios } from "@/actions/funcionarios.actions";
import { FuncionariosClient } from "./funcionarios-client";

export default async function FuncionariosPage() {
  const funcionarios = await listarFuncionarios();
  return <FuncionariosClient funcionarios={funcionarios} />;
}
