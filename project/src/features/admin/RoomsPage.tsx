import { BedDouble } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export default function RoomsPage() {
  return (
    <>
      <PageHeader
        title="مدیریت اتاق‌ها"
        description="افزودن، ویرایش و مدیریت اتاق‌ها، تصاویر و قیمت‌گذاری"
      />
      <SectionPlaceholder icon={BedDouble} phase={4} title="مدیریت اتاق‌ها" />
    </>
  );
}
