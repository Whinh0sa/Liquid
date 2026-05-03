import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { UrgencyLevel } from "@/constants/sellWindow";
import { useColors } from "@/hooks/useColors";

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
  daysAway: number;
}

export function UrgencyBadge({ urgency, daysAway }: UrgencyBadgeProps) {
  const colors = useColors();

  const config = {
    PLANNED: { label: `${daysAway}d away`, bg: colors.muted, text: colors.mutedForeground },
    WINDOW: { label: "Sell Now", bg: "#DCFCE7", text: colors.success },
    URGENT: { label: "Urgent", bg: "#FEF3C7", text: colors.warning },
    CLIFF: { label: "Cliff!", bg: "#FEF2F2", text: colors.destructive },
  }[urgency];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderRadius: colors.radius / 2 }]}>
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
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
