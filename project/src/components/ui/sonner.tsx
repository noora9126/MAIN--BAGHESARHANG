import { Toaster as SonnerToaster } from 'sonner';
import { cn } from '@/lib/utils';

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast: cn('rounded-lg border shadow-lg font-sans'),
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
