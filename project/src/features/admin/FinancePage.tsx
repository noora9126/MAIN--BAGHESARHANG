import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export default function FinancePage() {
  return (
    <>
      <PageHeader
        title="مدیریت مالی"
        description="نمودار درآمد، پیگیری پرداخت‌ها و گزارش‌ها"
      />
      <SectionPlaceholder icon={Wallet} phase={5} title="داشبورد مالی" />
    </>
  );
}
