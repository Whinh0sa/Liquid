import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Status = "HOLD" | "LIQUIDATE" | "IN_TRANSIT" | "ACTION_REQUIRED";

interface StatusBadgeProps {
  status: Status;
}

const LABELS: Record<Status, string> = {
  HOLD: "Hold",
  LIQUIDATE: "Sell",
  IN_TRANSIT: "In Transit",
  ACTION_REQUIRED: "Action",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = useColors();

  const bgColor =
    status === "HOLD"
      ? colors.muted
      : status === "LIQUIDATE"
        ? "#DCFCE7"
        : status === "IN_TRANSIT"
          ? "#DBEAFE"
          : "#FEF2F2";

  const textColor =
    status === "HOLD"
      ? colors.mutedForeground
      : status === "LIQUIDATE"
        ? colors.success
        : status === "IN_TRANSIT"
          ? colors.primary
          : colors.destructive;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor, borderRadius: colors.radius / 2 }]}>
      <Text style={[styles.label, { color: textColor }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
});
