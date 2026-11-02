// ─── AssetImage — Resilient Lazy Product Picture ──────────────────────────────
//
// Eliminates Cumulative Layout Shift (CLS) with fixed aspect containers,
// native lazy loading, skeleton pulse placeholders, and graceful SVG fallback.

import { useState } from "react";
import { Package } from "lucide-react";
import { getAssetImage } from "@/lib/assetImages";

interface AssetImageProps {
  model?: string;
  make?: string;
  category?: string;
  src?: string;
  alt?: string;
  className?: string;
  aspectRatio?: "video" | "square" | "hero";
}

export default function AssetImage({
  model,
  make,
  category,
  src,
  alt = "Product asset image",
  className = "",
  aspectRatio = "video",
}: AssetImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const resolvedSrc = src || getAssetImage(model, make, category);

  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "hero"
        ? "aspect-[16/7]"
        : "aspect-[16/10]";

  return (
    <div
      className={[
        "relative overflow-hidden bg-slate-100/80 w-full shrink-0",
        aspectClass,
        className,
      ].join(" ")}
    >
      {/* Skeleton Pulse when loading */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-slate-200/60 animate-pulse" />
      )}

      {!error ? (
        <img
          src={resolvedSrc}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={[
            "w-full h-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-1.5 p-2">
          <Package className="w-6 h-6 stroke-[1.5]" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            {category ?? "Hardware"}
          </span>
        </div>
      )}
    </div>
  );
}
