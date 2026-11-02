export function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
}

export const STARTER_ASSETS = [
  {
    category: "TECH" as const,
    make: "Apple",
    model: "iPhone 14 Pro - 256GB",
    storageCapacity: "256GB",
    purchasePrice: 109_900,
    currentEstimatedValue: 65_000,
    projectedDrop: 15_000,
    cliffDate: daysFromNow(12),
    cliffReason: "Apple Fall Keynote Expected",
    status: "HOLD" as const,
  },
  {
    category: "TECH" as const,
    make: "Apple",
    model: "MacBook Pro M2 - 14 inch",
    storageCapacity: undefined,
    purchasePrice: 199_900,
    currentEstimatedValue: 120_000,
    projectedDrop: 20_000,
    cliffDate: daysFromNow(85),
    cliffReason: "Historical Q4 hardware cycle",
    status: "HOLD" as const,
  },
  {
    category: "TECH" as const,
    make: "Sony",
    model: "A7IV Body",
    storageCapacity: undefined,
    purchasePrice: 249_800,
    currentEstimatedValue: 210_000,
    projectedDrop: 35_000,
    cliffDate: daysFromNow(3),
    cliffReason: "Competitor Firmware Release",
    status: "ACTION_REQUIRED" as const,
  },
  {
    category: "TECH" as const,
    make: "Apple",
    model: "iPad Pro M4 - 13 inch",
    storageCapacity: undefined,
    purchasePrice: 139_900,
    currentEstimatedValue: 105_000,
    projectedDrop: 12_000,
    cliffDate: daysFromNow(42),
    cliffReason: "Expected iPadOS refresh cycle",
    status: "HOLD" as const,
  },
  {
    category: "TECH" as const,
    make: "Sony",
    model: "WH-1000XM5",
    storageCapacity: undefined,
    purchasePrice: 39_900,
    currentEstimatedValue: 28_000,
    projectedDrop: 8_000,
    cliffDate: daysFromNow(8),
    cliffReason: "New model rumored — XM6",
    status: "ACTION_REQUIRED" as const,
  },
];
