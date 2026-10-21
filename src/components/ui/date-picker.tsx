"use client";

import React, { useState, useRef, useEffect, useId, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  format,
  parseISO,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  isValid,
} from "date-fns";

export interface DatePickerProps {
  value: string; // "yyyy-MM-dd"
  onChange: (dateStr: string) => void;
  minDate?: string; // "yyyy-MM-dd"
  label?: string;
  badge?: React.ReactNode;
  hint?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
}

export function DatePicker({
  value,
  onChange,
  minDate,
  label,
  badge,
  hint,
  error,
  disabled = false,
  placeholder = "Select event date...",
  className = "",
  id,
  name,
}: DatePickerProps) {
  const reactId = useId();
  const datePickerId = id || reactId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);

  // Parse current date or fallback
  const parsedValue = useMemo(() => {
    if (!value) return null;
    const d = parseISO(value);
    return isValid(d) ? d : null;
  }, [value]);

  const parsedMinDate = useMemo(() => {
    if (!minDate) return null;
    const d = parseISO(minDate);
    return isValid(d) ? startOfDay(d) : null;
  }, [minDate]);

  // View state for navigating months in popover
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    return parsedValue || (parsedMinDate ? parsedMinDate : new Date());
  });

  // When value changes externally and dialog opens, sync viewMonth
  useEffect(() => {
    if (parsedValue) {
      setViewMonth(parsedValue);
    }
  }, [parsedValue, isOpen]);

  // Position calculation with auto-flip
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpward = spaceBelow < 340 && spaceAbove > spaceBelow;

    setCoords({
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 300)),
      width: Math.max(280, rect.width),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }

    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const handleSelectDay = (day: Date) => {
    onChange(format(day, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const handleApplyPreset = (daysToAdd: number) => {
    const target = addDays(new Date(), daysToAdd);
    onChange(format(target, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  // Calendar grid math
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className={`relative w-full ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}

      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor={datePickerId}
            className="block text-xs font-semibold text-zinc-900"
          >
            {label}
          </label>
          {badge}
        </div>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={datePickerId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between text-left py-2 px-3.5 text-xs font-medium rounded-xl border cursor-pointer select-none transition-all duration-150 min-h-[38px] ${
          isOpen
            ? "border-indigo-600 ring-2 ring-indigo-500/10 bg-white"
            : error
            ? "border-rose-400 bg-rose-50/30 text-rose-900 hover:border-rose-500"
            : "border-zinc-200/90 bg-white text-zinc-900 hover:border-zinc-300 shadow-2xs"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-zinc-100" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <CalendarIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">
            {parsedValue ? (
              format(parsedValue, "EEE, MMM d, yyyy")
            ) : (
              <span className="text-zinc-400 font-normal">{placeholder}</span>
            )}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {/* Popover Calendar Grid via Portal */}
      {isOpen &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-label="Choose date"
            style={{
              position: "fixed",
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="rounded-2xl border border-zinc-200/90 bg-white shadow-2xl p-3.5 animate-in fade-in-0 zoom-in-95 duration-100 select-none"
          >
            {/* Quick Preset Pills */}
            <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-zinc-100 overflow-x-auto">
              <button
                type="button"
                onClick={() => handleApplyPreset(7)}
                className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] font-semibold text-zinc-600 transition-colors whitespace-nowrap cursor-pointer"
              >
                +7 Days (Earliest)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(14)}
                className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] font-semibold text-zinc-600 transition-colors whitespace-nowrap cursor-pointer"
              >
                +2 Weeks
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(30)}
                className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 text-[10px] font-semibold text-zinc-600 transition-colors whitespace-nowrap cursor-pointer"
              >
                +1 Month
              </button>
            </div>

            {/* Month Header */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-zinc-900 tracking-tight">
                {format(viewMonth, "MMMM yyyy")}
              </h4>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Weekday Initials */}
            <div className="grid grid-cols-7 text-center mb-1">
              {weekDays.map((d) => (
                <span key={d} className="text-[10px] font-medium text-zinc-400 py-0.5">
                  {d}
                </span>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {days.map((day) => {
                const isSelected = parsedValue ? isSameDay(day, parsedValue) : false;
                const isCurrentMonth = isSameMonth(day, viewMonth);
                const isPastOrBlocked = parsedMinDate ? isBefore(day, parsedMinDate) : false;

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isPastOrBlocked}
                    onClick={() => handleSelectDay(day)}
                    className={`h-7 w-7 mx-auto rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white font-semibold shadow-xs"
                        : isPastOrBlocked
                        ? "text-zinc-300 cursor-not-allowed bg-transparent"
                        : isCurrentMonth
                        ? "text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 font-medium active:scale-95"
                        : "text-zinc-400 hover:bg-zinc-50"
                    }`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
      {hint && !error && <p className="text-[11px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}
