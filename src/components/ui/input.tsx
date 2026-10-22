import React, { useId } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  className = "",
  containerClassName = "",
  id,
  ref,
  "aria-describedby": ariaDescribedBy,
  ...props
}: InputProps) {
  const reactId = useId();
  const inputId = id || reactId;
  const feedbackId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  const combinedDescribedBy = [feedbackId, ariaDescribedBy].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-zinc-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-zinc-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={combinedDescribedBy}
          className={`w-full text-sm text-zinc-900 bg-zinc-50/70 hover:bg-zinc-50 focus:bg-white border rounded-xl transition-all duration-150 outline-none placeholder:text-zinc-400 disabled:opacity-50 disabled:bg-zinc-100 disabled:cursor-not-allowed ${
            leftIcon ? "pl-9" : "pl-3.5"
          } ${rightElement ? "pr-10" : "pr-3.5"} ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
              : "border-zinc-200/90 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10"
          } py-2 ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2.5 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p id={feedbackId} className="mt-1.5 text-xs text-rose-600 font-medium">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={feedbackId} className="mt-1.5 text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}
