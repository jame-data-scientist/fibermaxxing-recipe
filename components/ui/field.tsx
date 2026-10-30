import * as React from "react";

import { cn } from "@/lib/utils";

export function Label({
  className,
  children,
  hint,
  htmlFor,
}: {
  className?: string;
  children: React.ReactNode;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("flex items-baseline justify-between gap-3", className)}
    >
      <span className="text-[13px] font-medium text-ink">{children}</span>
      {hint ? (
        <span className="text-[11px] text-moss">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        // 16px on phones stops iOS Safari from zooming the page on focus.
        "h-11 w-full rounded-md border border-line-strong bg-white px-3 text-[16px] text-ink placeholder:text-moss/60 sm:text-[15px]",
        "focus:border-forest focus:outline-none focus:ring-0",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-line-strong bg-white px-3 py-2.5 text-[16px] leading-relaxed text-ink placeholder:text-moss/60 sm:text-[15px]",
        "focus:border-forest focus:outline-none focus:ring-0",
        className,
      )}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full appearance-none rounded-md border border-line-strong bg-white px-3 pr-8 text-[16px] text-ink sm:text-[15px]",
        "focus:border-forest focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-[12px] text-rust">{children}</p>;
}

export function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[12px] leading-relaxed text-moss">{children}</p>;
}
