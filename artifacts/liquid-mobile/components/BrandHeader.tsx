import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function BrandHeader() {
  const colors = useColors();

  return (
    <View style={styles.row}>
      <Text style={[styles.brand, { color: colors.primary }]}>Liquid</Text>
      <View style={[styles.dot, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  brand: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
});
