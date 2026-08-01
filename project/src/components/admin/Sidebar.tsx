import { NavLink } from 'react-router-dom';
import { LogOut, TreePine } from 'lucide-react';
import { adminNavItems } from '@/features/admin/nav';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { admin, logout } = useAuth();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-forest-600 to-forest-800 text-white shadow">
          <TreePine className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold">هتل باغ سرهنگ</p>
          <p className="text-xs text-muted-foreground">پنل مدیریت</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-600 text-sm font-bold text-white">
            {(admin?.name || admin?.username || 'م').charAt(0)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{admin?.name || admin?.username}</p>
            <p className="truncate text-xs text-muted-foreground">{admin?.role || 'مدیر'}</p>
          </div>
        </div>
        <Separator className="mb-2" />
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          خروج از حساب
        </Button>
      </div>
    </div>
  );
}
