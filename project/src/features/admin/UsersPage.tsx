import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDisableUser,
  adminEnableUser,
  adminDeleteUser,
  adminGetRoles,
  apiError,
  type AdminUser,
  type RoleInfo,
} from '@/services/adminApi';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/features/auth/AuthProvider';

const ROLE_BADGE_VARIANTS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  RECEPTIONIST: 'bg-green-100 text-green-800',
  MANAGER: 'bg-purple-100 text-purple-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'مدیر ارشد سیستم',
  ADMIN: 'مدیر هتل',
  RECEPTIONIST: 'پذیرش',
  MANAGER: 'مدیر ارشد هتل',
  RESERVATION_MANAGER: 'مدیر رزرو',
  FINANCE_MANAGER: 'مدیر مالی',
  SUPPORT_ADMIN: 'مدیر پشتیبانی',
  VIEWER: 'ناظر',
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('ADMIN');

  const canManage = hasPermission('admins.manage');

  const load = useCallback(async () => {
    try {
      const [usersData, rolesData] = await Promise.all([adminListUsers(), adminGetRoles()]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormName('');
    setFormEmail('');
    setFormRole('ADMIN');
    setDialogOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormPassword('');
    setFormName(user.name || '');
    setFormEmail(user.email || '');
    setFormRole(user.role);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const body: Record<string, string> = {};
        if (formName !== (editingUser.name || '')) body.name = formName;
        if (formEmail !== (editingUser.email || '')) body.email = formEmail;
        if (formRole !== editingUser.role) body.role = formRole;
        if (formPassword) body.password = formPassword;
        await adminUpdateUser(editingUser.id, body);
        toast.success('کاربر ویرایش شد');
      } else {
        await adminCreateUser({
          username: formUsername,
          password: formPassword,
          name: formName || undefined,
          email: formEmail || undefined,
          role: formRole,
        });
        toast.success('کاربر ایجاد شد');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable(user: AdminUser) {
    try {
      await adminDisableUser(user.id);
      toast.success('کاربر غیرفعال شد');
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function handleEnable(user: AdminUser) {
    try {
      await adminEnableUser(user.id);
      toast.success('کاربر فعال شد');
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminDeleteUser(deleteTarget.id);
      toast.success('کاربر حذف شد');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (!canManage) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">شما دسترسی مدیریت کاربران را ندارید</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="مدیریت کاربران" description="مشاهده، ایجاد و ویرایش حساب‌های کاربری" />

      <div className="flex items-center justify-end">
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          کاربر جدید
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام کاربری</TableHead>
              <TableHead>نام</TableHead>
              <TableHead>ایمیل</TableHead>
              <TableHead>نقش</TableHead>
              <TableHead>آخرین ورود</TableHead>
              <TableHead className="text-left">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>{u.name || '—'}</TableCell>
                <TableCell>{u.email || '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={ROLE_BADGE_VARIANTS[u.role] || ''}>
                    {ROLE_LABELS[u.role] || u.role}
                  </Badge>
                </TableCell>
                <TableCell>{u.last_login ? new Date(u.last_login).toLocaleDateString('fa-IR') : 'هرگز'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {u.is_active === 0 ? (
                      <Button variant="ghost" size="icon" onClick={() => handleEnable(u)} title="فعال‌سازی">
                        <UserCheck className="h-4 w-4 text-green-600" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleDisable(u)} title="غیرفعال‌سازی">
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(u)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  هیچ کاربری یافت نشد
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'ویرایش کاربر' : 'کاربر جدید'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="u-username">نام کاربری</Label>
                <Input id="u-username" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="u-name">نام</Label>
              <Input id="u-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">ایمیل</Label>
              <Input id="u-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-role">نقش</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-password">{editingUser ? 'رمز جدید (خالی = بدون تغییر)' : 'رمز عبور'}</Label>
              <Input
                id="u-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required={!editingUser}
                minLength={8}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : null}
                {editingUser ? 'ذخیره' : 'ایجاد'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کاربر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف کاربر <strong>{deleteTarget?.username}</strong> اطمینان دارید؟ این عمل غیرقابل بازگشت است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
