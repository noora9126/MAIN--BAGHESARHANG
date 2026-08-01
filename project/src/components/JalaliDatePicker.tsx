import DatePicker from 'react-multi-date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import 'react-multi-date-picker/styles/colors/green.css';

interface Props {
  value?: string;
  onChange: (iso: string) => void;
  min?: string;
  placeholder?: string;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function toPersianDate(iso?: string): DateObject | undefined {
  if (!iso) return undefined;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return undefined;
  return new DateObject({ date: d, calendar: persian });
}

export default function JalaliDatePicker({ value, onChange, min, placeholder = 'انتخاب تاریخ', className = '' }: Props) {
  return (
    <DatePicker
      calendar={persian}
      locale={persian_fa}
      value={toPersianDate(value)}
      minDate={toPersianDate(min)}
      onChange={(date) => {
        if (!date) return;
        const d = date.toDate();
        onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }}
      placeholder={placeholder}
      inputClass={`w-full rounded-xl border border-forest-200 bg-forest-50/50 px-4 py-3 text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200 ${className}`}
      containerClassName="w-full"
      calendarPosition="bottom-center"
    />
  );
}
