"use client";

import React, { useState, useRef, useEffect, useId, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export type RawSelectOption<T extends string = string> = T | SelectOption<T>;

export interface SelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: RawSelectOption<T>[];
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  id?: string;
  name?: string;
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  label,
  hint,
  error,
  disabled = false,
  leftIcon,
  size = "md",
  className = "",
  triggerClassName = "",
  menuClassName = "",
  id,
  name,
}: SelectProps<T>) {
  const reactId = useId();
  const selectId = id || reactId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  // Normalize options to SelectOption objects
  const normalizedOptions: SelectOption<T>[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Calculate coordinates with auto-flip when near bottom of viewport
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // If trigger scrolled completely out of view, close it
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    // If tight space below (<220px) and more room above, open upward
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(240, Math.max(120, availableSpace));

    setCoords({
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }, []);

  // Update position on open and attach scroll/resize listeners
  useEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

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
    window.addEventListener("scroll", handleScrollOrResize, true); // true captures scroll in parent scrollable containers
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
      const idx = normalizedOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, normalizedOptions, value]);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
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
        break;
      case "ArrowDown": {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev + 1;
          while (next < normalizedOptions.length && normalizedOptions[next].disabled) {
            next++;
          }
          return next < normalizedOptions.length ? next : prev;
        });
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && normalizedOptions[next].disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
          const opt = normalizedOptions[highlightedIndex];
          if (!opt.disabled) {
            handleSelect(opt.value);
          }
        }
        break;
      }
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const sizeClasses = {
    sm: "py-1.5 px-3 text-xs rounded-lg min-h-[34px]",
    md: "py-2 px-3.5 text-xs font-medium rounded-xl min-h-[38px]",
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Hidden native input for form compatibility */}
      {name && <input type="hidden" name={name} value={value} />}

      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-zinc-900 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? selectId : undefined}
        className={`w-full flex items-center justify-between text-left transition-all duration-150 border cursor-pointer select-none ${
          sizeClasses[size]
        } ${
          isOpen
            ? "border-indigo-600 ring-2 ring-indigo-500/10 bg-white"
            : error
            ? "border-rose-400 bg-rose-50/30 text-rose-900 hover:border-rose-500"
            : "border-zinc-200/90 bg-white text-zinc-900 hover:border-zinc-300 shadow-2xs"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-zinc-100" : ""} ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {leftIcon && <span className="text-zinc-400 shrink-0">{leftIcon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : <span className="text-zinc-400 font-normal">{placeholder}</span>}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {/* Portal Dropdown Menu: renders directly on body to avoid modal overflow clipping */}
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
            className={`rounded-xl border border-zinc-200/90 bg-white shadow-2xl py-1 px-1 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100 ${menuClassName}`}
          >
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-400 text-center">
                No options available
              </div>
            ) : (
              normalizedOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors select-none ${
                      opt.disabled
                        ? "opacity-40 cursor-not-allowed"
                        : isSelected
                        ? "bg-indigo-50 text-indigo-900 font-semibold shadow-2xs"
                        : isHighlighted
                        ? "bg-zinc-100/80 text-zinc-900"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="min-w-0">
                        <div className="truncate">{opt.label}</div>
                        {opt.description && (
                          <div className="text-[10px] text-zinc-400 font-normal truncate mt-0.5">
                            {opt.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5] shrink-0 ml-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>,
          document.body
        )}

      {/* Error or Hint messages */}
      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
      {hint && !error && <p className="text-[11px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}
