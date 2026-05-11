import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-soft bg-white shadow-sm overflow-hidden",
        className
      )}
      {...props}
    />
  );
}
