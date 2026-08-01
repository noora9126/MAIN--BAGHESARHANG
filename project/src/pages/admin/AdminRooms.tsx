import { useEffect, useState } from 'react';
import { Save, Pencil, BedDouble } from 'lucide-react';
import { adminRooms, adminUpdateRoom, apiError, type Room } from '../../services/adminApi';
import { Modal, Loading, EmptyState, Field, inputCls, btnPrimary, btnOutline } from '../../components/admin/AdminUI';
import { formatToman, faNum } from '../../utils/dates';

export default function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editRoom, setEditRoom] = useState<Room | null>(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [status, setStatus] = useState('active');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    adminRooms()
      .then(setRooms)
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (r: Room) => {
    setEditRoom(r);
    setName(r.name || '');
    setPrice(String(r.pricePerNight ?? ''));
    setCapacity(String(r.capacity ?? ''));
    setDescription(r.description || '');
    setImage(r.image || r.images?.[0] || '');
    setStatus(r.status || 'active');
  };

  const save = async () => {
    if (!editRoom) return;
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('قیمت معتبر وارد کنید');
      return;
    }
    setBusy(true);
    try {
      await adminUpdateRoom(editRoom.id, {
        name, pricePerNight: priceNum, capacity: Number(capacity), description, image, status,
      });
      setEditRoom(null);
      setError('');
      load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-forest-800">مدیریت اتاق‌ها</h2>
        <span className="text-sm text-forest-400">{faNum(rooms.length)} اتاق</span>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <Loading />
      ) : rooms.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-2xl bg-white shadow-sm border border-forest-50">
              <div className="relative h-40">
                <img src={r.images?.[0] || r.image || '/images/hotel/eghamat-05.jpg'} alt={r.name} className="h-full w-full object-cover" />
                {r.status === 'inactive' && (
                  <span className="absolute top-3 left-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">غیرفعال</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-forest-800">{r.name}</h3>
                  <button onClick={() => openEdit(r)} className="rounded-lg bg-forest-50 p-2 text-forest-600 hover:bg-forest-100" title="ویرایش">
                    <Pencil size={15} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-forest-500 flex items-center gap-1.5">
                    <BedDouble size={15} /> {faNum(r.capacity)} نفر
                  </span>
                  <span className="font-black text-gold-600">{formatToman(r.pricePerNight)} <span className="text-xs text-forest-400 font-normal">/ شب</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ───── مودال ویرایش اتاق ───── */}
      <Modal open={editRoom !== null} onClose={() => setEditRoom(null)} title={`ویرایش: ${editRoom?.name || ''}`}>
        <div className="space-y-4">
          <Field label="نام اتاق">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="قیمت هر شب (تومان)">
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
            </Field>
            <Field label="ظرفیت (نفر)">
              <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="توضیحات">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
          </Field>
          <Field label="تصویر (URL)">
            <input value={image} onChange={(e) => setImage(e.target.value)} className={inputCls} dir="ltr" />
          </Field>
          <Field label="وضعیت">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </select>
          </Field>
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={busy} onClick={save}><Save size={15} /> ذخیره</button>
            <button className={btnOutline} onClick={() => setEditRoom(null)}>انصراف</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
