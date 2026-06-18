import { getAcademiaDashboardData } from "@/actions/academia-dashboard.actions";
import { AcademiaDashboardUI } from "@/components/academia/academia-dashboard-ui";

export default async function DashboardAcademiaPage() {
  const data = await getAcademiaDashboardData();
  return <AcademiaDashboardUI data={data} />;
}
