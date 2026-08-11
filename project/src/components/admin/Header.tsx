import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ChevronDown, KeyRound, Loader2, LogOut, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  adminMarkAllNotificationsRead,
  adminMarkNotificationRead,
  adminNotifications,
  changePassword,
  type AdminNotification,
} from '@/services/adminApi';
import { apiError } from '@/services/api';
import { adminNavItems } from '@/features/admin/nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { faNum, formatDateTime } from '@/utils/dates';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentItem = adminNavItems.find((item) => location.pathname.startsWith(item.path));

  const loadNotifications = useCallback(async () => {
    try {
      const data = await adminNotifications(30);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // بی‌صدا — اعلان‌ها نباید کار پنل را مختل کنند
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // بارگذاری اولیه + به‌روزرسانی دوره‌ای (هر ۶۰ ثانیه)
  useEffect(() => {
    loadNotifications();
    pollingRef.current = setInterval(loadNotifications, 60_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadNotifications]);

  async function handleMarkRead(id: number) {
    await adminMarkNotificationRead(id);
    setUnreadCount((c) => Math.max(0, c - 1));
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
  }

  async function handleMarkAllRead() {
    await adminMarkAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((list) => list.map((n) => ({ ...n, is_read: 1 })));
  }

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('رمز جدید حداقل ۶ کاراکتر باشد');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('تکرار رمز عبور مطابقت ندارد');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('رمز عبور با موفقیت تغییر کرد');
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

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
        <h1 className="truncate text-base font-bold sm:text-lg">{currentItem?.label ?? 'پنل مدیریت'}</h1>
        <p className="hidden text-xs text-muted-foreground sm:block">هتل باغ سرهنگ بابل</p>
      </div>

      <div className="ms-auto flex items-center gap-1.5 sm:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="اعلان‌ها">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white ring-2 ring-background">
                  {faNum(Math.min(unreadCount, 99))}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <DropdownMenuLabel className="p-0 font-bold">اعلان‌ها</DropdownMenuLabel>
              {unreadCount > 0 ? (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-forest-700" onClick={handleMarkAllRead}>
                  <CheckCheck className="h-3.5 w-3.5" />
                  خواندن همه
                </Button>
              ) : null}
            </div>
            <DropdownMenuSeparator className="my-0" />
            <ScrollArea className="max-h-96">
              {notifLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال بارگذاری...
                </div>
              ) : notifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">اعلان جدیدی ندارید</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleMarkRead(n.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-accent ${
                      n.is_read ? 'opacity-60' : ''
                    }`}
                  >
                    <span
                      className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        n.is_read ? 'bg-muted' : 'bg-forest-500'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{n.title}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{formatDateTime(n.created_at)}</span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{n.message}</span>
                    </span>
                  </button>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-accent">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-forest-600 font-bold text-white">
                  {(admin?.name || admin?.username || 'م').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[10rem] truncate text-sm font-medium md:block">
                {admin?.name || admin?.username}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-bold">{admin?.name || admin?.username}</p>
              <p className="text-xs font-normal text-muted-foreground">{admin?.role || 'مدیر سیستم'}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
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

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تغییر رمز عبور</DialogTitle>
            <DialogDescription>رمز عبور فعلی را وارد کرده و رمز جدید را تعیین کنید.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">رمز عبور فعلی</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">رمز عبور جدید</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">تکرار رمز عبور جدید</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : null}
                ذخیره
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
