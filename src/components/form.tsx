import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const fieldClass =
  "w-full border border-foreground/30 bg-white px-3 py-3 text-base outline-none focus:border-accent";

export function Field({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input {...props} className={fieldClass} />
      {hint && <span className="mt-1 block text-xs text-foreground/60">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea {...props} className={fieldClass} />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select {...props} className={fieldClass}>
        {children}
      </select>
    </label>
  );
}

export function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}

export function PrimaryButton({
  busy,
  children,
  className = "",
  ...props
}: { busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={`bg-accent px-5 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60 ${className}`}
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}
