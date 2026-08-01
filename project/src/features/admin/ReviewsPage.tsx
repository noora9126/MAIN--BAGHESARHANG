import { Star } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export default function ReviewsPage() {
  return (
    <>
      <PageHeader title="نظرات مهمانان" description="مدیریت و پاسخ به نظرات مهمانان" />
      <SectionPlaceholder icon={Star} phase={6} title="مدیریت نظرات" />
    </>
  );
}
