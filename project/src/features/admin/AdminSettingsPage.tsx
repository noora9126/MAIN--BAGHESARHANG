import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader
        title="تنظیمات"
        description="تنظیمات هتل، پیامک و درگاه پرداخت"
      />
      <SectionPlaceholder icon={Settings} phase={7} title="تنظیمات هتل" />
    </>
  );
}
