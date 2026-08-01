import { Users } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="مدیریت مهمانان"
        description="پروفایل مهمانان، تاریخچه رزرو و یادداشت‌ها"
      />
      <SectionPlaceholder icon={Users} phase={6} title="مدیریت مهمانان (CRM)" />
    </>
  );
}
