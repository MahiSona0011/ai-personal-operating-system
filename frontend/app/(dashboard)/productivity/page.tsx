import { LifeAreaPage } from "@/components/shared/LifeAreaPage";

export default function ProductivityPage() {
  // Covers Discipline (1) + Focus (2)
  return <LifeAreaPage areaIds={[1, 2]} />;
}
