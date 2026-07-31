import { formatCurrencyNoDecimals } from "../lib/format";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { Asset } from "@workspace/api-client-react";
import { useUpdateAssetStatus } from "@workspace/api-client-react";

import { computeSellWindow } from "@/constants/sellWindow";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";
import { UrgencyBadge } from "./UrgencyBadge";

interface AssetCardProps {
  asset: Asset;
  onUpdated?: () => void;
}

function fmt(cents: number) {
  return `$${formatCurrencyNoDecimals(cents / 100)}`;
}

function pct(purchase: number, current: number) {
  const diff = ((current - purchase) / purchase) * 100;
  return diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
}

export function AssetCard({ asset, onUpdated }: AssetCardProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const { mutate: updateStatus, isPending } = useUpdateAssetStatus({
    mutation: { onSuccess: onUpdated },
  });

  const sw = computeSellWindow(
    asset.depreciationCliff.daysAway,
    asset.depreciationCliff.projectedDrop / 100,
  );

  const gain = asset.currentValue - asset.purchasePrice;
  const gainColor = gain >= 0 ? colors.success : colors.destructive;
  const gainStr = pct(asset.purchasePrice, asset.currentValue);

  function handleStatusChange(status: Asset["status"]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Update Status",
      `Mark as ${status.replace("_", " ")}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => updateStatus({ id: asset.id, data: { status } }),
        },
      ],
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setExpanded((e) => !e)}
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={[styles.model, { color: colors.foreground }]} numberOfLines={1}>
            {asset.model}
          </Text>
          <Text style={[styles.category, { color: colors.mutedForeground }]}>
            {asset.category}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.value, { color: colors.foreground }]}>
            {fmt(asset.currentValue)}
          </Text>
          <Text style={[styles.gain, { color: gainColor }]}>{gainStr}</Text>
        </View>
      </View>

      <View style={styles.badges}>
        <StatusBadge status={asset.status} />
        <UrgencyBadge urgency={sw.urgency} daysAway={asset.depreciationCliff.daysAway} />
        <View style={styles.spacer} />
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.mutedForeground}
        />
      </View>

      {expanded && (
        <View style={[styles.details, { borderTopColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
              Purchase price
            </Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {fmt(asset.purchasePrice)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
              Depreciation cliff
            </Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {asset.depreciationCliff.daysAway}d — {asset.depreciationCliff.reason}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
              Projected drop
            </Text>
            <Text style={[styles.detailValue, { color: colors.destructive }]}>
              -{fmt(asset.depreciationCliff.projectedDrop)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
              Sell by
            </Text>
            <Text
              style={[
                styles.detailValue,
                {
                  color:
                    sw.urgency === "CLIFF" || sw.urgency === "URGENT"
                      ? colors.destructive
                      : sw.urgency === "WINDOW"
                        ? colors.success
                        : colors.foreground,
                },
              ]}
            >
              {sw.sellByLabel}
            </Text>
          </View>

          <View style={styles.actions}>
            {(["HOLD", "LIQUIDATE", "IN_TRANSIT"] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor:
                      asset.status === s ? colors.primary : colors.card,
                    borderColor: asset.status === s ? colors.primary : colors.border,
                    borderRadius: colors.radius / 2,
                  },
                ]}
                onPress={() => handleStatusChange(s)}
                disabled={isPending || asset.status === s}
              >
                {isPending && asset.status !== s ? (
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                ) : (
                  <Text
                    style={[
                      styles.actionLabel,
                      {
                        color: asset.status === s ? colors.primaryForeground : colors.foreground,
                      },
                    ]}
                  >
                    {s === "IN_TRANSIT" ? "In Transit" : s.charAt(0) + s.slice(1).toLowerCase()}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  left: { flex: 1, gap: 2 },
  right: { alignItems: "flex-end", gap: 2 },
  model: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  category: { fontSize: 12, fontFamily: "Inter_400Regular" },
  value: { fontSize: 15, fontFamily: "Inter_700Bold" },
  gain: { fontSize: 12, fontFamily: "Inter_500Medium" },
  badges: { flexDirection: "row", alignItems: "center", gap: 6 },
  spacer: { flex: 1 },
  details: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  detailLabel: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  detailValue: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right", flex: 1 },
  actions: { flexDirection: "row", gap: 6, marginTop: 4 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 7,
    alignItems: "center",
  },
  actionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
