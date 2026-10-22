"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  disabled?: boolean;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex^="-"])';

function isElementVisible(el: HTMLElement): boolean {
  return (
    el.getAttribute("aria-hidden") !== "true" &&
    (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  maxWidth = "md",
  className = "",
  disabled = false,
}: ModalProps) {
  const modalCardRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Preserve previous active element on open, restore only when modal closes or unmounts
  useEffect(() => {
    if (isOpen) {
      if (!previousActiveElementRef.current) {
        previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      }
    } else if (previousActiveElementRef.current) {
      if (typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    };
  }, []);

  const onCloseRef = useRef(onClose);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    onCloseRef.current = onClose;
    disabledRef.current = disabled;
  });

  // Trap focus and handle Escape
  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = setTimeout(() => {
      if (modalCardRef.current) {
        const focusables = Array.from(
          modalCardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(isElementVisible);
        if (focusables.length > 0) {
          focusables[0]?.focus();
        } else {
          // When no interactive controls are enabled (e.g. during pending actions), focus the dialog card itself
          modalCardRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (disabledRef.current || e.defaultPrevented) return;
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab" && modalCardRef.current) {
        const focusables = Array.from(
          modalCardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(isElementVisible);

        if (focusables.length === 0) {
          // Prevent tabbing out of modal when controls are disabled
          e.preventDefault();
          modalCardRef.current.focus();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/45 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={!disabled ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalCardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative w-full ${maxWidthClass} rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-2xl z-10 outline-hidden animate-in fade-in zoom-in-95 duration-150 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {icon && <div className="shrink-0 pt-0.5">{icon}</div>}
            <div className="min-w-0 flex-1">
              <h3 id="modal-title" className="text-base font-semibold text-zinc-900 leading-snug">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="p-1.5 -mr-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4">{children}</div>

        {/* Optional Footer */}
        {footer && <div className="mt-6 pt-4 border-t border-zinc-100">{footer}</div>}
      </div>
    </div>
  );
}
