import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "wpp" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

const sizes = {
  md: "h-10 px-4",
  lg: "h-12 px-6 text-[15px]",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-white text-[#08090d] hover:bg-white/90 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset]",
  secondary:
    "border border-[var(--border-strong)] bg-white/[0.03] text-[var(--text-primary)] hover:bg-white/[0.06] hover:border-white/20",
  wpp: "bg-[var(--wpp)] text-[#04140a] hover:bg-[var(--wpp-strong)] font-semibold",
  ghost: "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
};

type Props = {
  children: ReactNode;
  variant?: Variant;
  size?: keyof typeof sizes;
  href?: string;
  external?: boolean;
  className?: string;
} & Omit<ComponentProps<"a">, "href" | "className">;

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  external,
  className = "",
  ...rest
}: Props) {
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a className={cls} {...rest}>
      {children}
    </a>
  );
}
