import type { LucideIcon } from 'lucide-react';
import { Hammer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SectionPlaceholderProps {
  icon: LucideIcon;
  phase: number;
  title: string;
}

export function SectionPlaceholder({ icon: Icon, phase, title }: SectionPlaceholderProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            این بخش در فاز {phase} پروژه پیاده‌سازی خواهد شد
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-xs text-muted-foreground">
          <Hammer className="h-3.5 w-3.5" />
          در حال توسعه
        </div>
      </CardContent>
    </Card>
  );
}
