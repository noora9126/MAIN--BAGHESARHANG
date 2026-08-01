import { LayoutDashboard } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="داشبورد"
        description="نمای کلی عملکرد هتل: اشغال، درآمد و رزروهای اخیر"
      />
      <SectionPlaceholder icon={LayoutDashboard} phase={5} title="داشبورد مالی و عملیاتی" />
    </>
  );
}
