import { ReportTabs } from "./report-tabs";

export default async function ReportLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <ReportTabs companyId={id} />
      {children}
    </div>
  );
}
