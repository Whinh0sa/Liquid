import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getGetPortfolioQueryOptions } from "@workspace/api-client-react";
import React from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/BrandHeader";
import { SectionCard } from "@/components/SectionCard";
import { HealthRing } from "@/components/HealthRing";
import { computeSellWindow } from "@/constants/sellWindow";
import { useColors } from "@/hooks/useColors";

export default function RingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useQuery(getGetPortfolioQueryOptions());
  const portfolio = data?.portfolio ?? [];
  const headerTop = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  if (isLoading) return <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: headerTop }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (isError) return <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: headerTop }]}><Feather name="alert-circle" size={32} color={colors.destructive} /><Text style={[styles.errorText, { color: colors.mutedForeground }]}>Failed to load data</Text><Text style={[styles.retryText, { color: colors.primary }]} onPress={() => refetch()}>Tap to retry</Text></View>;

  const totalValue = portfolio.reduce((s, a) => s + a.currentValue, 0) / 100;
  const totalPurchase = portfolio.reduce((s, a) => s + a.purchasePrice, 0) / 100;
  const retained = totalPurchase > 0 ? (totalValue / totalPurchase) * 100 : 0;
  const urgencies = portfolio.map((a) => computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100));
  const safeCount = urgencies.filter((u) => u.urgency === "PLANNED").length;
  const inWindowCount = urgencies.filter((u) => u.urgency === "WINDOW").length;
  const atRiskCount = urgencies.filter((u) => u.urgency === "URGENT" || u.urgency === "CLIFF").length;
  const holdCount = portfolio.filter((a) => a.status === "HOLD").length;
  const liquidateCount = portfolio.filter((a) => a.status === "LIQUIDATE").length;
  const inTransitCount = portfolio.filter((a) => a.status === "IN_TRANSIT").length;
  const totalCapAtRisk = portfolio.filter((a) => {
    const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100);
    return sw.urgency === "URGENT" || sw.urgency === "CLIFF";
  }).reduce((s, a) => s + a.depreciationCliff.projectedDrop, 0) / 100;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: headerTop + 12, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) }]} showsVerticalScrollIndicator={false}>
      <BrandHeader />
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Portfolio Health</Text>
      <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Visual scorecard of your asset health</Text>

      <SectionCard>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Value Retention</Text>
        <View style={styles.ringsRow}>
          <HealthRing label="Retained" value={Math.round(retained)} max={100} color={retained >= 80 ? colors.success : retained >= 60 ? colors.warning : colors.destructive} unit="%" />
          <HealthRing label="Portfolio" value={totalValue} max={Math.max(totalPurchase, totalValue)} color={colors.primary} unit="$" size={90} />
          <HealthRing label="At Risk" value={totalCapAtRisk} max={Math.max(totalValue, totalCapAtRisk)} color={totalCapAtRisk > 0 ? colors.destructive : colors.success} unit="$" size={90} />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Urgency Breakdown</Text>
        <View style={styles.ringsRow}>
          <HealthRing label="Safe" value={safeCount} max={Math.max(portfolio.length, 1)} color={colors.success} unit="" />
          <HealthRing label="In Window" value={inWindowCount} max={Math.max(portfolio.length, 1)} color={colors.primary} unit="" />
          <HealthRing label="At Risk" value={atRiskCount} max={Math.max(portfolio.length, 1)} color={colors.destructive} unit="" />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Status Distribution</Text>
        <View style={styles.ringsRow}>
          <HealthRing label="Hold" value={holdCount} max={Math.max(portfolio.length, 1)} color={colors.mutedForeground} unit="" />
          <HealthRing label="Sell" value={liquidateCount} max={Math.max(portfolio.length, 1)} color={colors.success} unit="" />
          <HealthRing label="Transit" value={inTransitCount} max={Math.max(portfolio.length, 1)} color={colors.primary} unit="" />
        </View>
      </SectionCard>

      <View style={[styles.summaryCard, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
        <Feather name="shield" size={20} color="rgba(255,255,255,0.9)" />
        <View style={styles.summaryText}>
          <Text style={styles.summaryTitle}>{atRiskCount === 0 ? "Portfolio is healthy" : `${atRiskCount} item${atRiskCount > 1 ? "s" : ""} need attention`}</Text>
          <Text style={styles.summarySub}>{safeCount} safe · {inWindowCount} in sell window · {atRiskCount} urgent</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -8 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ringsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  summaryCard: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  summaryText: { flex: 1, gap: 2 },
  summaryTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  summarySub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  errorText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
