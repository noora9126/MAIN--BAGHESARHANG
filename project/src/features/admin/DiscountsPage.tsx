import { Percent } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export default function DiscountsPage() {
  return (
    <>
      <PageHeader title="تخفیف‌ها" description="مدیریت کدها و طرح‌های تخفیف" />
      <SectionPlaceholder icon={Percent} phase={3} title="مدیریت تخفیف‌ها" />
    </>
  );
}
