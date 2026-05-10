"use client";

import { Calendar, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import * as React from "react";

import { cn, toArabicDigits } from "@/lib/utils";

type PickerMode = "date" | "datetime";

type DateTimePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  mode?: PickerMode;
  required?: boolean;
  placeholder?: string;
  className?: string;
};

type ParsedValue = {
  date: Date;
  hours: number;
  minutes: number;
};

type TimeValue = {
  hours: number;
  minutes: number;
};

const weekdays = ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

const hours = Array.from({ length: 12 }, (_, index) => index + 1);
const minutes = Array.from({ length: 60 }, (_, index) => index);

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function parsePickerValue(value: string): ParsedValue | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hoursValue = match[4] ? Number(match[4]) : 9;
  const minutesValue = match[5] ? Number(match[5]) : 0;
  const date = new Date(year, month, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day ||
    hoursValue < 0 ||
    hoursValue > 23 ||
    minutesValue < 0 ||
    minutesValue > 59
  ) {
    return null;
  }

  return { date, hours: hoursValue, minutes: minutesValue };
}

function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTimeValue(date: Date, time: TimeValue) {
  return `${formatDateValue(date)}T${pad(time.hours)}:${pad(time.minutes)}`;
}

function sameDay(left: Date | null, right: Date) {
  return (
    !!left &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function toTwelveHour(value: number) {
  return value % 12 || 12;
}

function toTwentyFourHour(hour12: number, period: "AM" | "PM") {
  const normalized = hour12 % 12;
  return period === "PM" ? normalized + 12 : normalized;
}

function getFallbackDate(viewDate: Date) {
  const today = new Date();
  const lastDayInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

  return new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    Math.min(today.getDate(), lastDayInMonth),
  );
}

function formatDisplayValue(value: string, mode: PickerMode) {
  const parsed = parsePickerValue(value);

  if (!parsed) {
    return "";
  }

  const dateLabel = new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed.date);

  if (mode === "date") {
    return dateLabel;
  }

  const dateWithTime = new Date(parsed.date);
  dateWithTime.setHours(parsed.hours, parsed.minutes, 0, 0);

  const timeLabel = new Intl.DateTimeFormat("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(dateWithTime);

  return `${dateLabel} - ${timeLabel}`;
}

export function DateTimePicker({
  id,
  value,
  onChange,
  mode = "date",
  required,
  placeholder,
  className,
}: DateTimePickerProps) {
  const initialValue = parsePickerValue(value);
  const now = new Date();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(
    () => new Date(initialValue?.date.getFullYear() ?? now.getFullYear(), initialValue?.date.getMonth() ?? now.getMonth(), 1),
  );
  const [time, setTime] = React.useState<TimeValue>({
    hours: initialValue?.hours ?? now.getHours(),
    minutes: initialValue?.minutes ?? 0,
  });

  const selectedValue = React.useMemo(() => parsePickerValue(value), [value]);
  const displayValue = React.useMemo(() => formatDisplayValue(value, mode), [mode, value]);
  const selectedPeriod = time.hours >= 12 ? "PM" : "AM";
  const selectedHour12 = toTwelveHour(time.hours);

  React.useEffect(() => {
    const parsed = parsePickerValue(value);

    if (!parsed) {
      return;
    }

    setViewDate(new Date(parsed.date.getFullYear(), parsed.date.getMonth(), 1));

    if (mode === "datetime") {
      setTime({ hours: parsed.hours, minutes: parsed.minutes });
    }
  }, [mode, value]);

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const calendarCells = React.useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();

    return Array.from({ length: 42 }, (_, index) => new Date(year, month, index - firstWeekday + 1));
  }, [viewDate]);

  const monthLabel = React.useMemo(
    () => new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(viewDate),
    [viewDate],
  );

  const selectDate = (date: Date) => {
    const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (mode === "datetime") {
      onChange(formatDateTimeValue(nextDate, time));
      return;
    }

    onChange(formatDateValue(nextDate));
    setOpen(false);
  };

  const selectTime = (nextTime: TimeValue) => {
    setTime(nextTime);
    onChange(formatDateTimeValue(selectedValue?.date ?? getFallbackDate(viewDate), nextTime));
  };

  const selectToday = () => {
    const today = new Date();
    const nextDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (mode === "datetime") {
      onChange(formatDateTimeValue(nextDate, time));
      return;
    }

    onChange(formatDateValue(nextDate));
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        type="text"
        readOnly
        required={required}
        value={displayValue}
        placeholder={placeholder ?? (mode === "datetime" ? "اختر التاريخ والوقت" : "اختر التاريخ")}
        className={cn(
          "touch-target min-h-12 w-full cursor-pointer rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-secondary focus:ring-4 focus:ring-secondary/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
          className,
        )}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      />

      <button
        type="button"
        aria-label="فتح اختيار التاريخ"
        className="absolute left-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-secondary dark:hover:bg-slate-800"
        onClick={() => setOpen((current) => !current)}
      >
        <Calendar className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-[70] mt-2 max-w-[calc(100vw-3rem)] rounded-2xl border border-secondary/30 bg-white p-3 text-slate-900 shadow-[0_24px_70px_rgba(2,8,23,0.30)] ring-1 ring-secondary/10 dark:bg-slate-950 dark:text-slate-100 dark:shadow-[0_24px_70px_rgba(0,0,0,0.55)]",
            mode === "datetime" ? "w-[34rem]" : "w-[20rem]",
          )}
          dir="rtl"
        >
          <div className={cn("grid gap-3", mode === "datetime" && "sm:grid-cols-[13rem_1fr]")}>
            {mode === "datetime" && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-300">
                  <Clock className="h-4 w-4 text-secondary" />
                  <span>وقت الامتحان</span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2" dir="ltr">
                  <div className="scrollbar-none max-h-44 min-w-0 space-y-1 overflow-y-auto">
                    {hours.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        className={cn(
                          "h-9 w-full rounded-lg text-sm font-extrabold transition",
                          selectedHour12 === hour
                            ? "bg-secondary text-white"
                            : "bg-white text-slate-700 hover:bg-secondary/10 hover:text-secondary dark:bg-slate-950 dark:text-slate-200",
                        )}
                        onClick={() => selectTime({ ...time, hours: toTwentyFourHour(hour, selectedPeriod) })}
                      >
                        {pad(hour)}
                      </button>
                    ))}
                  </div>

                  <div className="scrollbar-none max-h-44 min-w-0 space-y-1 overflow-y-auto">
                    {minutes.map((minute) => (
                      <button
                        key={minute}
                        type="button"
                        className={cn(
                          "h-9 w-full rounded-lg text-sm font-extrabold transition",
                          time.minutes === minute
                            ? "bg-secondary text-white"
                            : "bg-white text-slate-700 hover:bg-secondary/10 hover:text-secondary dark:bg-slate-950 dark:text-slate-200",
                        )}
                        onClick={() => selectTime({ ...time, minutes: minute })}
                      >
                        {pad(minute)}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {(["AM", "PM"] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        className={cn(
                          "h-9 w-12 rounded-lg text-xs font-extrabold transition",
                          selectedPeriod === period
                            ? "bg-primary text-white dark:bg-secondary"
                            : "bg-white text-slate-700 hover:bg-secondary/10 hover:text-secondary dark:bg-slate-950 dark:text-slate-200",
                        )}
                        onClick={() => selectTime({ ...time, hours: toTwentyFourHour(selectedHour12, period) })}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="الشهر السابق"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-secondary/60 hover:bg-secondary/10 hover:text-secondary dark:border-slate-800 dark:text-slate-300"
                  onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{monthLabel}</p>
                <button
                  type="button"
                  aria-label="الشهر التالي"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-secondary/60 hover:bg-secondary/10 hover:text-secondary dark:border-slate-800 dark:text-slate-300"
                  onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center" dir="ltr">
                {weekdays.map((day) => (
                  <div key={day} className="py-1 text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                    {day}
                  </div>
                ))}

                {calendarCells.map((date) => {
                  const isSelected = sameDay(selectedValue?.date ?? null, date);
                  const isToday = sameDay(new Date(), date);
                  const isMuted = date.getMonth() !== viewDate.getMonth();

                  return (
                    <button
                      key={formatDateValue(date)}
                      type="button"
                      className={cn(
                        "grid h-9 place-items-center rounded-xl text-xs font-extrabold transition",
                        isMuted
                          ? "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                          : "text-slate-700 hover:bg-secondary/10 hover:text-secondary dark:text-slate-200",
                        isToday && "ring-1 ring-secondary/50",
                        isSelected && "bg-secondary text-white shadow-lg shadow-secondary/25 hover:bg-secondary hover:text-white",
                      )}
                      onClick={() => selectDate(date)}
                    >
                      {toArabicDigits(date.getDate())}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-rose-500 transition hover:bg-rose-500/10"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
              مسح
            </button>

            <button
              type="button"
              className="rounded-lg px-2 py-1.5 text-xs font-bold text-secondary transition hover:bg-secondary/10"
              onClick={selectToday}
            >
              اليوم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
