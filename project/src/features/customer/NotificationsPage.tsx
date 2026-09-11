import { useEffect, useState } from 'react';
import { BellOff, Check, CheckCheck, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type CustomerNotification,
} from '@/services/customerApi';
import { apiError } from '@/services/api';
import { jalaliString } from '@/utils/dates';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const typeIcons: Record<string, string> = {
  RESERVATION_CONFIRMED: '✅',
  RESERVATION_CANCELLED: '❌',
  PAYMENT_SUCCESS: '💰',
  CHECK_IN: '🏨',
  CHECK_OUT: '👋',
  GENERAL: '📢',
  DISCOUNT: '🎁',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: number) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      toast.success('همه اعلان‌ها خوانده شد');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <>
      <PageHeader
        title="اعلان‌ها"
        description={`شما ${unreadCount} اعلان خوانده‌نشده دارید`}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4" />
              همه خوانده شد
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-forest-600" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error}
          <Button variant="outline" className="mt-4" onClick={loadNotifications}>
            تلاش مجدد
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-forest-50 bg-white p-10 text-center shadow-sm">
          <BellOff className="mx-auto mb-4 h-12 w-12 text-forest-300" />
          <h3 className="mb-2 font-bold text-forest-800">اعلانی ندارید</h3>
          <p className="text-sm text-forest-500">اعلان‌های جدید شما اینجا نمایش داده خواهند شد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 transition-all sm:p-5 ${
                n.is_read
                  ? 'border-forest-50 bg-white'
                  : 'border-forest-200 bg-forest-50/50 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{typeIcons[n.type] || '📢'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold ${n.is_read ? 'text-forest-600' : 'text-forest-800'}`}>
                      {n.title}
                    </h4>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-forest-500" />
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-forest-600">{n.message}</p>
                  <p className="mt-2 text-xs text-forest-400">{jalaliString(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="shrink-0 rounded-lg p-1.5 text-forest-400 transition-colors hover:bg-forest-100 hover:text-forest-600"
                    title="خوانده شد"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
