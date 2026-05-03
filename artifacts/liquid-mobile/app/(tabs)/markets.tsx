import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getGetPortfolioQueryOptions } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { computeSellWindow } from "@/constants/sellWindow";
import { useColors } from "@/hooks/useColors";

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function MarketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useQuery(
    getGetPortfolioQueryOptions(),
  );

  const portfolio = data?.portfolio ?? [];
  const headerTop =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const withWindows = portfolio.map((a) => ({
    ...a,
    sw: computeSellWindow(
      a.depreciationCliff.daysAway,
      a.depreciationCliff.projectedDrop / 100,
    ),
  }));

  const cliff = withWindows.filter((a) => a.sw.urgency === "CLIFF");
  const urgent = withWindows.filter((a) => a.sw.urgency === "URGENT");
  const window_ = withWindows.filter((a) => a.sw.urgency === "WINDOW");
  const planned = withWindows.filter((a) => a.sw.urgency === "PLANNED");

  const totalAtRisk = withWindows
    .filter((a) => a.sw.urgency !== "PLANNED")
    .reduce((acc, a) => acc + a.depreciationCliff.projectedDrop, 0);

  if (isLoading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, paddingTop: headerTop },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, paddingTop: headerTop },
        ]}
      >
        <Feather name="alert-circle" size={32} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          Failed to load data
        </Text>
        <Text
          style={[styles.retryText, { color: colors.primary }]}
          onPress={() => refetch()}
        >
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerTop + 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>
        Market Analysis
      </Text>
      <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
        Depreciation timing across your portfolio
      </Text>

      {totalAtRisk > 0 && (
        <View
          style={[
            styles.riskBanner,
            {
              backgroundColor: "#FEF2F2",
              borderColor: "#FECACA",
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="trending-down" size={18} color={colors.destructive} />
          <View style={styles.bannerText}>
            <Text style={[styles.bannerTitle, { color: colors.destructive }]}>
              {fmt(totalAtRisk)} at risk
            </Text>
            <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
              Value at risk from upcoming depreciation cliffs
            </Text>
          </View>
        </View>
      )}

      {cliff.length > 0 && (
        <Section
          title="Cliff"
          subtitle="Value already dropped"
          color={colors.destructive}
          icon="x-circle"
          items={cliff}
          colors={colors}
        />
      )}
      {urgent.length > 0 && (
        <Section
          title="Urgent"
          subtitle="Window closing fast"
          color={colors.warning}
          icon="alert-triangle"
          items={urgent}
          colors={colors}
        />
      )}
      {window_.length > 0 && (
        <Section
          title="Sell Window"
          subtitle="Optimal time to list"
          color={colors.success}
          icon="check-circle"
          items={window_}
          colors={colors}
        />
      )}
      {planned.length > 0 && (
        <Section
          title="Planned"
          subtitle="No immediate action needed"
          color={colors.mutedForeground}
          icon="clock"
          items={planned}
          colors={colors}
        />
      )}
    </ScrollView>
  );
}

interface SectionProps {
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  items: ReturnType<typeof computeSellWindow> extends infer SW
    ? Array<{
        id: string;
        model: string;
        category: string;
        currentValue: number;
        depreciationCliff: { daysAway: number; projectedDrop: number; reason: string };
        sw: ReturnType<typeof computeSellWindow>;
      }>
    : never;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}

function Section({ title, subtitle, color, icon, items, colors }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Feather name={icon as never} size={16} color={color} />
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            {subtitle}
          </Text>
        </View>
        <View
          style={[
            styles.countBadge,
            { backgroundColor: color + "20", borderRadius: 99 },
          ]}
        >
          <Text style={[styles.countText, { color }]}>{items.length}</Text>
        </View>
      </View>

      {items.map((item) => (
        <View
          key={item.id}
          style={[
            styles.itemRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <View style={styles.itemLeft}>
            <Text style={[styles.itemModel, { color: colors.foreground }]} numberOfLines={1}>
              {item.model}
            </Text>
            <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
              {item.sw.sellByLabel} · −{fmt(item.depreciationCliff.projectedDrop)}
            </Text>
          </View>
          <View style={styles.itemRight}>
            <Text style={[styles.itemValue, { color: colors.foreground }]}>
              {fmt(item.currentValue)}
            </Text>
            <Text style={[styles.itemDays, { color }]}>
              {item.depreciationCliff.daysAway}d
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 20 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -12 },
  riskBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  bannerText: { flex: 1, gap: 2 },
  bannerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  bannerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  countBadge: { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
  },
  itemLeft: { flex: 1, gap: 2 },
  itemRight: { alignItems: "flex-end", gap: 2 },
  itemModel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  itemValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  itemDays: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
