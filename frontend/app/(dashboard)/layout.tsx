import { DashboardLayout } from "@/components/shared/DashboardLayout";

/** Every signed-in page shares the sidebar and top bar. Pages render only their own content. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
