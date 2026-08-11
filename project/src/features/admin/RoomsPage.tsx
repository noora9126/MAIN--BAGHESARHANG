import { useCallback, useEffect, useState } from 'react';
import {
  BedDouble, Plus, Pencil, Power, PowerOff, Loader2, Users, Ruler, Star,
  Image as ImageIcon, Trash2, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/PageHeader';
import { Modal, Loading, EmptyState, Field, inputCls, btnPrimary, btnOutline, btnDanger } from '@/components/admin/AdminUI';
import { adminRooms, adminCreateRoom, adminUpdateRoom } from '@/services/adminApi';
import type { Room } from '@/services/api';
import { formatToman, faNum } from '@/utils/dates';

interface RoomForm {
  name: string;
  type: string;
  roomNumber: string;
  pricePerNight: string;
  capacity: string;
  extraCapacity: string;
  area: string;
  rating: string;
  popular: boolean;
  description: string;
  image: string;
  images: string;
  status: string;
}

const emptyForm: RoomForm = {
  name: '', type: '', roomNumber: '', pricePerNight: '', capacity: '2', extraCapacity: '0',
  area: '', rating: '4.8', popular: false, description: '', image: '', images: '', status: 'inactive',
};

function roomToForm(r: Room): RoomForm {
  return {
    name: r.name || '',
    type: r.type || '',
    roomNumber: r.roomNumber || '',
    pricePerNight: String(r.pricePerNight ?? ''),
    capacity: String(r.capacity ?? ''),
    extraCapacity: String(r.extraCapacity ?? ''),
    area: r.area || '',
    rating: String(r.rating ?? ''),
    popular: Boolean(r.popular),
    description: r.description || '',
    image: r.image || '',
    images: (r.images || []).join('\n'),
    status: r.status || 'inactive',
  };
}

function formToPayload(f: RoomForm) {
  return {
    name: f.name.trim(),
    type: f.type.trim(),
    roomNumber: f.roomNumber.trim(),
    pricePerNight: Number(f.pricePerNight),
    capacity: Number(f.capacity),
    extraCapacity: Number(f.extraCapacity) || 0,
    area: f.area.trim(),
    rating: Number(f.rating) || 0,
    popular: f.popular,
    description: f.description.trim(),
    image: f.image.trim(),
    images: f.images.split('\n').map((s) => s.trim()).filter(Boolean),
    status: f.status,
  };
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<RoomForm>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminRooms();
      setRooms(list);
    } catch {
      toast.error('دریافت اتاق‌ها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof RoomForm>(key: K, value: RoomForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditId(room.id);
    setForm(roomToForm(room));
    setModalOpen(true);
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return 'نام اتاق الزامی است';
    const price = Number(form.pricePerNight);
    if (isNaN(price) || price < 0) return 'قیمت هر شب معتبر نیست';
    const cap = Number(form.capacity);
    if (isNaN(cap) || cap < 1) return 'ظرفیت معتبر نیست';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) return toast.error(err);
    setActing(true);
    try {
      if (editId === null) {
        await adminCreateRoom(formToPayload(form));
        toast.success('اتاق جدید ایجاد شد');
      } else {
        await adminUpdateRoom(editId, formToPayload(form));
        toast.success('اتاق ویرایش شد');
      }
      setModalOpen(false);
      await load();
    } catch {
      toast.error('خطا در ذخیره‌سازی');
    } finally {
      setActing(false);
    }
  };

  const toggleStatus = async (room: Room) => {
    setActing(true);
    try {
      const next = room.status === 'active' ? 'inactive' : 'active';
      await adminUpdateRoom(room.id, { status: next });
      toast.success(next === 'active' ? 'اتاق فعال شد' : 'اتاق غیرفعال شد');
      await load();
    } catch {
      toast.error('خطا در تغییر وضعیت');
    } finally {
      setActing(false);
    }
  };

  const removeImage = (img: string) => {
    set('images', form.images.split('\n').filter((s) => s.trim() !== img.trim()).join('\n'));
  };

  return (
    <>
      <PageHeader
        title="مدیریت اتاق‌ها"
        description="افزودن، ویرایش، قیمت‌گذاری و فعال/غیرفعال‌سازی اتاق‌ها — همگام با دیتابیس"
        actions={
          <button onClick={openCreate} className={btnPrimary}>
            <Plus size={16} /> افزودن اتاق
          </button>
        }
      />

      {/* آمار سریع */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
          <p className="text-xs text-forest-400">کل اتاق‌ها</p>
          <p className="mt-1 text-xl font-black text-forest-800">{faNum(rooms.length)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
          <p className="text-xs text-forest-400">اتاق‌های فعال</p>
          <p className="mt-1 text-xl font-black text-green-700">{faNum(rooms.filter((r) => r.status === 'active').length)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-forest-50">
          <p className="text-xs text-forest-400">مجموع ظرفیت (تخت اصلی)</p>
          <p className="mt-1 text-xl font-black text-forest-800">{faNum(rooms.reduce((s, r) => s + (r.capacity || 0), 0))}</p>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : rooms.length === 0 ? (
        <EmptyState text="اتاقی ثبت نشده است — اولین اتاق را اضافه کنید" />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <div key={room.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-forest-50">
              <div className="relative h-40 bg-forest-50">
                {room.image ? (
                  <img src={room.image} alt={room.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-forest-200">
                    <BedDouble size={40} />
                  </div>
                )}
                <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold ${room.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'}`}>
                  {room.status === 'active' ? 'فعال' : 'غیرفعال'}
                </span>
                {room.popular && (
                  <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-2.5 py-1 text-[10px] font-bold text-white">ویژه</span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-forest-800">{room.name}</h3>
                    <p className="mt-0.5 text-[11px] text-forest-400">
                      {room.type || 'اتاق'}
                      {room.roomNumber ? ` — شماره ${faNum(room.roomNumber)}` : ''}
                    </p>
                  </div>
                  <p className="font-black text-gold-600">{formatToman(room.pricePerNight ?? 0)}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-forest-600">
                  <span className="inline-flex items-center gap-1"><Users size={12} /> {faNum(room.capacity ?? 0)} نفر{room.extraCapacity ? ` + ${faNum(room.extraCapacity)} تخت اضافه` : ''}</span>
                  {room.area && <span className="inline-flex items-center gap-1"><Ruler size={12} /> {faNum(room.area)} متر</span>}
                  {room.rating ? <span className="inline-flex items-center gap-1"><Star size={12} className="text-gold-500" /> {faNum(Number(room.rating).toFixed(1))}</span> : null}
                  <span className="inline-flex items-center gap-1"><ImageIcon size={12} /> {faNum((room.images || []).length)} عکس</span>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-forest-50 pt-3">
                  <button onClick={() => openEdit(room)} disabled={acting} className={`${btnOutline} flex-1 !px-2 !py-2 text-xs`}>
                    <Pencil size={13} /> ویرایش
                  </button>
                  <button
                    onClick={() => toggleStatus(room)}
                    disabled={acting}
                    className={`flex-1 !px-2 !py-2 text-xs ${room.status === 'active' ? btnDanger : btnPrimary}`}
                  >
                    {acting ? <Loader2 size={13} className="animate-spin" /> : room.status === 'active' ? <PowerOff size={13} /> : <Power size={13} />}
                    {room.status === 'active' ? 'غیرفعال' : 'فعال‌سازی'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ───── مودال افزودن / ویرایش ───── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId === null ? 'افزودن اتاق جدید' : 'ویرایش اتاق'} wide>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام اتاق *">
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="مثلاً: اتاق دونفره جنگل" className={inputCls} />
            </Field>
            <Field label="نوع اتاق">
              <input value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="مثلاً: استاندارد / لوکس" className={inputCls} />
            </Field>
            <Field label="شماره اتاق">
              <input value={form.roomNumber} onChange={(e) => set('roomNumber', e.target.value)} placeholder="مثلاً: 101" className={inputCls} />
            </Field>
            <Field label="قیمت هر شب (تومان) *">
              <input type="number" min="0" value={form.pricePerNight} onChange={(e) => set('pricePerNight', e.target.value)} placeholder="مثلاً: 2500000" className={inputCls} />
            </Field>
            <Field label="ظرفیت (تخت اصلی) *">
              <input type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} className={inputCls} />
            </Field>
            <Field label="تخت اضافه">
              <input type="number" min="0" value={form.extraCapacity} onChange={(e) => set('extraCapacity', e.target.value)} className={inputCls} />
            </Field>
            <Field label="متراژ (متر)">
              <input value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="مثلاً: 32" className={inputCls} />
            </Field>
            <Field label="امتیاز (۰ تا ۵)">
              <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => set('rating', e.target.value)} className={inputCls} />
            </Field>
            <Field label="تصویر اصلی (آدرس)">
              <input value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="https://..." dir="ltr" className={inputCls} />
            </Field>
            <Field label="وضعیت">
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                <option value="active">فعال — قابل رزرو</option>
                <option value="inactive">غیرفعال</option>
              </select>
            </Field>
          </div>

          <Field label="گالری تصاویر (هر آدرس در یک خط)">
            <textarea
              value={form.images}
              onChange={(e) => set('images', e.target.value)}
              rows={3}
              dir="ltr"
              placeholder={'https://example.com/room-1.jpg\nhttps://example.com/room-2.jpg'}
              className={inputCls}
            />
            {form.images.split('\n').map((img) => img.trim()).filter(Boolean).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.images.split('\n').map((img) => img.trim()).filter(Boolean).map((img, i) => (
                  <div key={i} className="group relative h-14 w-20 overflow-hidden rounded-lg border border-forest-100">
                    <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <button
                      type="button"
                      onClick={() => removeImage(img)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                      title="حذف تصویر"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <Field label="توضیحات">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className={inputCls} />
          </Field>

          <label className="flex items-center gap-2 text-sm font-medium text-forest-700">
            <input type="checkbox" checked={form.popular} onChange={(e) => set('popular', e.target.checked)} className="h-4 w-4 rounded border-forest-300 accent-forest-600" />
            نمایش در بخش «اتاق‌های ویژه»
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-forest-50 pt-4">
            <button onClick={() => setModalOpen(false)} className={btnOutline}>انصراف</button>
            <button onClick={save} disabled={acting} className={btnPrimary}>
              {acting ? <Loader2 size={15} className="animate-spin" /> : editId === null ? <Plus size={15} /> : <CheckCircle2 size={15} />}
              {editId === null ? 'ایجاد اتاق' : 'ذخیره تغییرات'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}