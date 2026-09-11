import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerSidebar } from '@/components/customer/CustomerSidebar';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

export default function CustomerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div dir="rtl" className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 border-l bg-sidebar lg:block">
        <CustomerSidebar />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetTitle className="sr-only">منوی کاربری</SheetTitle>
          <CustomerSidebar onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col lg:mr-64">
        <CustomerHeader onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}