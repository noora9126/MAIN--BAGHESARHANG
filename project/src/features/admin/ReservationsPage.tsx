import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export default function ReservationsPage() {
  return (
    <>
      <PageHeader
        title="مدیریت رزروها"
        description="ایجاد، ویرایش، لغو و پیگیری رزروها + نمای تقویمی"
      />
      <SectionPlaceholder icon={CalendarDays} phase={3} title="مدیریت رزروها" />
    </>
  );
}
