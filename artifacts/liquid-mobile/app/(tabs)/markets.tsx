import { formatCurrencyNoDecimals } from "../../lib/format";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getGetPortfolioQueryOptions } from "@workspace/api-client-react";
import React from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/BrandHeader";
import { SectionCard } from "@/components/SectionCard";
import { computeSellWindow } from "@/constants/sellWindow";
import { useColors } from "@/hooks/useColors";

function fmt(cents: number) {
  return `${formatCurrencyNoDecimals.format(cents / 100)}`;
}

export default function MarketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useQuery(getGetPortfolioQueryOptions());
  const portfolio = data?.portfolio ?? [];
  const headerTop = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const withWindows = portfolio.map((a) => ({
    ...a,
    sw: computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100),
  }));

  const groups = [
    ["CLIFF", "Cliff", colors.destructive, "x-circle", "Value already dropped"],
    ["URGENT", "Urgent", colors.warning, "alert-triangle", "Window closing fast"],
    ["WINDOW", "Sell Window", colors.success, "check-circle", "Optimal time to list"],
    ["PLANNED", "Planned", colors.mutedForeground, "clock", "No immediate action needed"],
  ] as const;

  if (isLoading) {
    return <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: headerTop }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (isError) {
    return <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: headerTop }]}><Feather name="alert-circle" size={32} color={colors.destructive} /><Text style={[styles.errorText, { color: colors.mutedForeground }]}>Failed to load data</Text><Text style={[styles.retryText, { color: colors.primary }]} onPress={() => refetch()}>Tap to retry</Text></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: headerTop + 12, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) }]} showsVerticalScrollIndicator={false}>
      <BrandHeader />
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Market Analysis</Text>
      <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Depreciation timing across your portfolio</Text>

      <SectionCard>
        <Text style={[styles.bannerTitle, { color: colors.destructive }]}>Total at risk: {fmt(withWindows.filter((a) => a.sw.urgency !== "PLANNED").reduce((acc, a) => acc + a.depreciationCliff.projectedDrop, 0))}</Text>
        <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>Value at risk from upcoming depreciation cliffs</Text>
      </SectionCard>

      {groups.map(([urgency, title, color, icon, subtitle]) => {
        const items = withWindows.filter((a) => a.sw.urgency === urgency);
        if (!items.length) return null;
        return (
          <SectionCard key={urgency}>
            <View style={styles.sectionHeader}>
              <Feather name={icon} size={16} color={color} />
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
                <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: color + "20" }]}><Text style={[styles.countText, { color }]}>{items.length}</Text></View>
            </View>
            {items.map((item) => (
              <View key={item.id} style={[styles.itemRow, { borderColor: colors.border }]}>
                <View style={styles.itemLeft}>
                  <Text style={[styles.itemModel, { color: colors.foreground }]} numberOfLines={1}>{item.model}</Text>
                  <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>{item.sw.sellByLabel} · −{fmt(item.depreciationCliff.projectedDrop)}</Text>
                </View>
                <View style={styles.itemRight}><Text style={[styles.itemValue, { color: colors.foreground }]}>{fmt(item.currentValue)}</Text><Text style={[styles.itemDays, { color }]}>{item.depreciationCliff.daysAway}d</Text></View>
              </View>
            ))}
          </SectionCard>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -8 },
  bannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  bannerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  countBadge: { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1 },
  itemLeft: { flex: 1, gap: 2 },
  itemRight: { alignItems: "flex-end", gap: 2 },
  itemModel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  itemValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  itemDays: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
