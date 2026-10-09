import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const fieldClass =
  "box-border w-full rounded-sm border border-[#C6C6CB] bg-white px-3.5 text-[15px] outline-none focus:border-accent";

export function Field({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input {...props} className={`${fieldClass} h-12`} />
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <textarea {...props} className={`${fieldClass} py-3`} />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <select {...props} className={`${fieldClass} h-12`}>
        {children}
      </select>
    </label>
  );
}

export function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-sm border border-[#B42318] bg-[#FEF3F2] px-3 py-2 text-sm text-[#B42318]">
      {message}
    </p>
  );
}

type ButtonProps = { busy?: boolean; tone?: "accent" | "dark" | "outline" } & React.ButtonHTMLAttributes<HTMLButtonElement>;

const tones = {
  accent: "bg-accent text-foreground",
  dark: "bg-foreground text-white",
  outline: "border border-[#C6C6CB] bg-white text-foreground",
};

export function PrimaryButton({ busy, tone = "accent", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={`min-h-11 cursor-pointer rounded-sm px-5 text-sm font-semibold hover:opacity-90 disabled:opacity-60 ${tones[tone]} ${className}`}
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}
