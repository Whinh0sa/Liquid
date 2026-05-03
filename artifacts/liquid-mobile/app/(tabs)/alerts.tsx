import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getGetPortfolioQueryOptions } from "@workspace/api-client-react";
import React from "react";
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/BrandHeader";
import { SectionCard } from "@/components/SectionCard";
import { computeSellWindow, type UrgencyLevel } from "@/constants/sellWindow";
import { useColors } from "@/hooks/useColors";

interface AlertItem { id: string; model: string; category: string; urgency: UrgencyLevel; daysAway: number; projectedDrop: number; reason: string; currentValue: number; sellByLabel: string; }

function fmt(cents: number) { return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }

function AlertRow({ alert, colors }: { alert: AlertItem; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const urgencyConfig = { CLIFF: { color: colors.destructive, bg: "#FEF2F2", icon: "x-circle" as const, label: "Cliff Reached" }, URGENT: { color: colors.warning, bg: "#FEF3C7", icon: "alert-triangle" as const, label: "Urgent" }, WINDOW: { color: colors.success, bg: "#DCFCE7", icon: "check-circle" as const, label: "Sell Window Open" }, PLANNED: { color: colors.mutedForeground, bg: colors.card, icon: "clock" as const, label: "Planned" } }[alert.urgency];
  return <View style={[styles.alertRow, { backgroundColor: urgencyConfig.bg, borderColor: urgencyConfig.color + "30", borderRadius: colors.radius }]}><View style={[styles.iconWrap, { backgroundColor: urgencyConfig.color + "15" }]}><Feather name={urgencyConfig.icon} size={18} color={urgencyConfig.color} /></View><View style={styles.alertContent}><View style={styles.alertTop}><Text style={[styles.alertModel, { color: colors.foreground }]} numberOfLines={1}>{alert.model}</Text><Text style={[styles.alertUrgency, { color: urgencyConfig.color }]}>{urgencyConfig.label}</Text></View><Text style={[styles.alertReason, { color: colors.mutedForeground }]} numberOfLines={1}>{alert.reason}</Text><View style={styles.alertBottom}><Text style={[styles.alertMeta, { color: colors.mutedForeground }]}>{alert.sellByLabel}</Text><Text style={[styles.alertDrop, { color: urgencyConfig.color }]}>−{fmt(alert.projectedDrop)} projected</Text></View></View></View>;
}

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery(getGetPortfolioQueryOptions());
  const portfolio = data?.portfolio ?? [];
  const headerTop = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const alerts: AlertItem[] = portfolio.map((a) => { const sw = computeSellWindow(a.depreciationCliff.daysAway, a.depreciationCliff.projectedDrop / 100); return { id: a.id, model: a.model, category: a.category, urgency: sw.urgency, daysAway: a.depreciationCliff.daysAway, projectedDrop: a.depreciationCliff.projectedDrop, reason: a.depreciationCliff.reason, currentValue: a.currentValue, sellByLabel: sw.sellByLabel }; }).filter((a) => a.urgency !== "PLANNED").sort((a, b) => { const order: Record<UrgencyLevel, number> = { CLIFF: 0, URGENT: 1, WINDOW: 2, PLANNED: 3 }; return order[a.urgency] - order[b.urgency]; });

  if (isLoading) return <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: headerTop }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (isError) return <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: headerTop }]}><Feather name="alert-circle" size={32} color={colors.destructive} /><Text style={[styles.errorText, { color: colors.mutedForeground }]}>Failed to load alerts</Text><Text style={[styles.retryText, { color: colors.primary }]} onPress={() => refetch()}>Tap to retry</Text></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: headerTop + 12, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}>
      <BrandHeader />
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Alerts</Text>
      <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Items requiring attention</Text>
      <SectionCard>
        {alerts.length === 0 ? <View style={styles.emptyState}><Feather name="check-circle" size={48} color={colors.success} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>All clear</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No items need attention right now</Text></View> : <View style={styles.list}>{alerts.map((alert) => <AlertRow key={alert.id} alert={alert} colors={colors} />)}</View>}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -6 },
  list: { gap: 10 },
  alertRow: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12, borderWidth: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  alertContent: { flex: 1, gap: 4 },
  alertTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 4 },
  alertModel: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  alertUrgency: { fontSize: 12, fontFamily: "Inter_700Bold" },
  alertReason: { fontSize: 12, fontFamily: "Inter_400Regular" },
  alertBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  alertDrop: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  errorText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
