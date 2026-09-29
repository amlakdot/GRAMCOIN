import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
