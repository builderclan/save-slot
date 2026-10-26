"use client";

import React, { useState, useRef, useEffect, useId, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Clock, ChevronDown, Check } from "lucide-react";

export interface TimePickerProps {
  value: string; // "HH:mm" e.g. "14:00"
  onChange: (timeStr: string) => void;
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

// Generate half-hour time slots from 00:00 to 23:30 (all 48 slots)
function generateTimeSlots(): Array<{ value: string; label: string; sublabel: string }> {
  const slots: Array<{ value: string; label: string; sublabel: string }> = [];
  for (let h = 0; h <= 23; h++) {
    for (const m of [0, 30]) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      const val = `${hh}:${mm}`;

      const period = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayStr = `${displayH.toString().padStart(2, "0")}:${mm} ${period}`;

      slots.push({
        value: val,
        label: displayStr,
        sublabel: val,
      });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export function TimePicker({
  value,
  onChange,
  label,
  badge,
  hint,
  error,
  disabled = false,
  placeholder = "Select time...",
  className = "",
  id,
  name,
}: TimePickerProps) {
  const reactId = useId();
  const timePickerId = id || reactId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const highlightedItemRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  // Format display text for value
  const displayLabel = useMemo(() => {
    if (!value) return null;
    const match = TIME_SLOTS.find((s) => s.value === value);
    if (match) return match.label;

    // Handle custom non-standard time format gracefully
    const [hStr, mStr] = value.split(":");
    const h = parseInt(hStr, 10);
    if (isNaN(h)) return value;
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH.toString().padStart(2, "0")}:${mStr || "00"} ${period}`;
  }, [value]);

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
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(240, Math.max(120, availableSpace));

    const popoverWidth = Math.min(rect.width, window.innerWidth - 24);
    const popoverLeft = Math.max(12, Math.min(rect.left, window.innerWidth - popoverWidth - 12));

    setCoords({
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
      left: popoverLeft,
      width: popoverWidth,
      maxHeight,
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

  // Sync highlightedIndex with selected value when opened
  useEffect(() => {
    if (isOpen) {
      const idx = TIME_SLOTS.findIndex((s) => s.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value]);

  // Scroll active item into view when popover opens and mounts into portal
  useEffect(() => {
    if (!isOpen) {
      hasScrolledRef.current = false;
      return;
    }

    if (coords && selectedItemRef.current && !hasScrolledRef.current) {
      selectedItemRef.current.scrollIntoView({ block: "center" });
      hasScrolledRef.current = true;
    }
  }, [isOpen, coords]);

  // Scroll highlighted item into view on arrow navigation
  useEffect(() => {
    if (isOpen && highlightedItemRef.current) {
      highlightedItemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isOpen, highlightedIndex]);

  const handleSelectTime = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "ArrowDown": {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < TIME_SLOTS.length - 1 ? prev + 1 : prev));
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < TIME_SLOTS.length) {
          handleSelectTime(TIME_SLOTS[highlightedIndex].value);
        }
        break;
      }
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}

      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor={timePickerId}
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
        id={timePickerId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-activedescendant={
          isOpen && highlightedIndex >= 0 ? `${timePickerId}-opt-${highlightedIndex}` : undefined
        }
        className={`w-full flex items-center justify-between text-left py-2 px-3.5 text-xs font-medium rounded-xl border cursor-pointer select-none transition-all duration-150 min-h-[38px] ${
          isOpen
            ? "border-indigo-600 ring-2 ring-indigo-500/10 bg-white"
            : error
            ? "border-rose-400 bg-rose-50/30 text-rose-900 hover:border-rose-500"
            : "border-zinc-200/90 bg-white text-zinc-900 hover:border-zinc-300 shadow-2xs"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-zinc-100" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">
            {displayLabel || <span className="text-zinc-400 font-normal">{placeholder}</span>}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {/* Popover List of Time Slots via Portal */}
      {isOpen &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: "fixed",
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
            }}
            className="rounded-xl border border-zinc-200/90 bg-white shadow-2xl py-1 px-1 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100 select-none"
          >
            {TIME_SLOTS.map((slot, idx) => {
              const isSelected = slot.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <div
                  key={slot.value}
                  id={`${timePickerId}-opt-${idx}`}
                  ref={(node) => {
                    if (isSelected) {
                      (selectedItemRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                    }
                    if (isHighlighted) {
                      (highlightedItemRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                    }
                  }}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectTime(slot.value)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors select-none ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-900 font-semibold shadow-2xs"
                      : isHighlighted
                      ? "bg-zinc-100 text-zinc-950"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{slot.label}</span>
                    <span className="text-[10px] text-zinc-400 font-normal font-mono">
                      ({slot.sublabel})
                    </span>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5] shrink-0" />
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}

      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
      {hint && !error && <p className="text-[11px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}
