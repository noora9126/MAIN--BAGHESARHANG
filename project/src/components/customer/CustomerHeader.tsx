import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LogOut, Menu, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/features/customerAuth/CustomerAuthProvider';
import { customerNavItems } from '@/features/customer/customerNav';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CustomerHeaderProps {
  onOpenSidebar: () => void;
}

export function CustomerHeader({ onOpenSidebar }: CustomerHeaderProps) {
  const { customer, logout } = useCustomerAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const prevPathRef = useRef(location.pathname);
  const [current, setCurrent] = useState(() => {
    const item = customerNavItems.find((i) => location.pathname.startsWith(i.path));
    return item?.label ?? 'پنل کاربری';
  });

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      const item = customerNavItems.find((i) => location.pathname.startsWith(i.path));
      setCurrent(item?.label ?? 'پنل کاربری');
    }
  }, [location.pathname]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="باز کردن منو"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0">
        <h1 className="truncate text-base font-bold sm:text-lg">{current}</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">هتل باغ سرهنگ بابل</p>
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-accent">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-forest-600 font-bold text-white">
                  {(customer?.full_name || 'م').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[10rem] truncate text-sm font-medium md:block">
                {customer?.full_name}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-bold">{customer?.full_name}</p>
              <p className="text-xs font-normal text-muted-foreground" dir="ltr">
                {customer?.mobile}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/account/profile')}>
              <User className="h-4 w-4" />
              پروفایل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/account/password')}>
              <KeyRound className="h-4 w-4" />
              تغییر رمز عبور
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              خروج از حساب
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}