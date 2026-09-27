import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-2xl border border-line bg-white p-5 shadow-[0_3px_15px_#1a352508] ${className}`} {...props} />;
}

type Variant = "primary" | "dark" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-lime text-forest hover:brightness-95",
  dark: "bg-forest text-white hover:bg-[#1c3f34]",
  secondary: "bg-mist text-forest hover:brightness-95",
  ghost: "bg-transparent text-forest hover:bg-mist",
  danger: "bg-rose text-white hover:brightness-110",
};
const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function Pill({ children, tone = "mist" }: { children: ReactNode; tone?: "mist" | "forest" | "clay" | "rose" }) {
  const tones = {
    mist: "bg-mist text-jade",
    forest: "bg-forest-soft text-white",
    clay: "bg-clay text-[#6b4a1f]",
    rose: "bg-rose-soft text-rose",
  };
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wide ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-mist" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-sage transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5 mt-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
    </div>
  );
}

export function Zh({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span lang="zh-HK" className={className}>
      {children}
    </span>
  );
}
