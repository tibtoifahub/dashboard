import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StatisticsDashboard } from "@/components/statistics/StatisticsDashboard";

export default async function StatisticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return null;
  }

  return (
    <StatisticsDashboard role={session.user.role} />
  );
}

