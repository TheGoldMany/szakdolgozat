"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  value:    number;
  onChange?: (v: number) => void;
  size?:    "sm" | "md" | "lg";
  readonly?: boolean;
}

const SIZE = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };

export function StarRating({ value, onChange, size = "md", readonly = false }: Props) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={clsx(
            "transition-transform",
            !readonly && "cursor-pointer hover:scale-110",
            readonly && "cursor-default"
          )}
        >
          <Star
            className={clsx(
              SIZE[size],
              i <= active
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}
