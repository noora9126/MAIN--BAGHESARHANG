import { ConciergeBell } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export default function ServicesPage() {
  return (
    <>
      <PageHeader title="خدمات هتل" description="مدیریت خدمات و امکانات هتل" />
      <SectionPlaceholder icon={ConciergeBell} phase={6} title="مدیریت خدمات" />
    </>
  );
}
