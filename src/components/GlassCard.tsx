import { cn } from "@/lib/utils";
import { ReactNode, HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

const GlassCard = ({ children, className, hover = true, ...props }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "bg-card/50 backdrop-blur-xl border border-border/50 rounded-xl p-6",
        "shadow-glass relative overflow-hidden",
        hover && "hover:border-primary/50 hover:shadow-glow-primary transition-all duration-300 hover-lift group",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/0 before:via-primary/0 before:to-primary/0",
        "before:transition-all before:duration-500 hover:before:from-primary/5 hover:before:via-primary/10 hover:before:to-primary/5",
        className
      )}
      {...props}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;