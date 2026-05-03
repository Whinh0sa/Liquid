import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import {
  getGetPortfolioQueryOptions,
  setBaseUrl,
} from "@workspace/api-client-react";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AssetCard } from "@/components/AssetCard";
import { StatCard } from "@/components/StatCard";
import { useColors } from "@/hooks/useColors";

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

function fmt(dollars: number) {
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function PortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery(getGetPortfolioQueryOptions());

  const portfolio = data?.portfolio ?? [];
  const metrics = data?.metrics;

  const headerTop =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderItem = useCallback(
    ({ item }: { item: (typeof portfolio)[0] }) => (
      <AssetCard asset={item} onUpdated={() => refetch()} />
    ),
    [refetch],
  );

  const ListHeader = (
    <View style={styles.listHeader}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.primary,
            borderRadius: colors.radius,
            marginTop: headerTop + 16,
          },
        ]}
      >
        <Text style={[styles.heroLabel, { color: "rgba(255,255,255,0.75)" }]}>
          Portfolio Value
        </Text>
        <Text style={[styles.heroValue, { color: colors.primaryForeground }]}>
          {metrics ? fmt(metrics.totalNetWorth) : "—"}
        </Text>
        <Text style={[styles.heroSub, { color: "rgba(255,255,255,0.65)" }]}>
          {portfolio.length} items tracked
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Capital at Risk"
          value={metrics ? fmt(metrics.capitalAtRisk) : "—"}
          subtitle="within 15 days"
          accent={
            metrics && metrics.capitalAtRisk > 500
              ? "destructive"
              : "neutral"
          }
        />
        <StatCard
          label="Items"
          value={String(portfolio.length)}
          subtitle="in portfolio"
          accent="primary"
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Your Items
      </Text>
    </View>
  );

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
          Failed to load portfolio
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={portfolio}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        scrollEnabled={!!portfolio.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="package" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No items in your portfolio
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  content: { paddingHorizontal: 16, gap: 0 },
  listHeader: { gap: 14, marginBottom: 8 },
  heroCard: {
    padding: 24,
    gap: 4,
  },
  heroLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  heroValue: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  errorText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", gap: 10, paddingTop: 40 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
