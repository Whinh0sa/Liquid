/**
 * High-Quality Curated Product Imagery Resolver
 * Matches equipment, devices, watches, and items to authentic studio photography.
 */

interface ProductImageMatch {
  keywords: string[];
  url: string;
}

const PRODUCT_IMAGES: ProductImageMatch[] = [
  // Apple iPhones
  {
    keywords: ["iphone 16", "iphone 15", "iphone 14", "iphone 13", "iphone"],
    url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80",
  },
  // Apple MacBooks
  {
    keywords: ["macbook pro", "macbook air", "macbook", "m2", "m3", "m1"],
    url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
  },
  // Apple iPads
  {
    keywords: ["ipad pro", "ipad air", "ipad mini", "ipad"],
    url: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80",
  },
  // Sony Alpha / Cameras
  {
    keywords: ["a7iv", "a7", "sony camera", "alpha", "dslr", "mirrorless", "canon", "nikon"],
    url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
  },
  // Sony Headphones / Audio
  {
    keywords: ["wh-1000xm5", "wh-1000xm4", "headphones", "airpods max", "bose", "sony xm"],
    url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
  },
  // Luxury Watches
  {
    keywords: ["rolex", "submariner", "patek", "audemars", "omega", "watch", "chrono"],
    url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80",
  },
  // Sneakers / Footwear
  {
    keywords: ["jordan", "air jordan", "sneaker", "yeezy", "dunk", "nike"],
    url: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80",
  },
  // Gaming Consoles / GPUs
  {
    keywords: ["ps5", "playstation", "xbox", "nintendo", "rtx", "gpu"],
    url: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80",
  },
];

const DEFAULT_TECH = "https://images.unsplash.com/photo-1468495244123-6c6c332eeede?auto=format&fit=crop&w=600&q=80";
const DEFAULT_FASHION = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80";

/**
 * Resolves an authentic product image URL for an asset based on model, make, and category.
 */
export function getAssetImage(model?: string, make?: string, category?: string): string {
  const query = `${make ?? ""} ${model ?? ""}`.toLowerCase().trim();

  for (const match of PRODUCT_IMAGES) {
    if (match.keywords.some((kw) => query.includes(kw))) {
      return match.url;
    }
  }

  if (category?.toUpperCase() === "FASHION") {
    return DEFAULT_FASHION;
  }

  return DEFAULT_TECH;
}
