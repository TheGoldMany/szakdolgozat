import { useCallback, useState } from "react";
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, ListState, colors, radius, spacing } from "@/components/ui";
import { ApiError, getMyApplications, withdrawApplication, type MyApplication } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";

/**
 * Az örökbefogadási kérelem életciklusa a docs/03-adoption.md szerint:
 * PENDING → REVIEWING → APPROVED / REJECTED, illetve INVITED (meghívó
 * kiküldve, még nincs kitöltve) és WITHDRAWN (a kérelmező visszavonta).
 *
 * A színek nem díszítés: a végállapotokat (elfogadva / elutasítva) elsőre meg
 * kell tudni különböztetni a folyamatban lévőktől, mert a felhasználó ezért
 * nyitja meg ezt a képernyőt.
 */
const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  INVITED:   { label: "Meghívva",        bg: "#E0E7FF", fg: "#3730A3" },
  PENDING:   { label: "Függőben",        bg: "#FEF3C7", fg: "#92400E" },
  REVIEWING: { label: "Elbírálás alatt", bg: "#DBEAFE", fg: "#1E40AF" },
  APPROVED:  { label: "Elfogadva",       bg: "#D1FAE5", fg: "#065F46" },
  REJECTED:  { label: "Elutasítva",      bg: "#FEE2E2", fg: "#991B1B" },
  WITHDRAWN: { label: "Visszavonva",     bg: "#F3F4F6", fg: "#4B5563" },
};

export default function ApplicationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetcher = useCallback(() => getMyApplications(), [user?.id]);
  const { data, error, loading, reload } = useApi<MyApplication[]>(fetcher, [user?.id]);
  const apps = data ?? [];

  /**
   * Visszavonás.
   *
   * Megerősítést kérünk, mert a művelet nem visszafordítható: visszavont
   * kérelemből nem lesz újra függőben lévő, újat kell beadni.
   */
  function confirmWithdraw(app: MyApplication) {
    Alert.alert(
      "Kérelem visszavonása",
      `Biztosan visszavonod a(z) ${app.animal.name} kérelmedet? Ezt nem lehet visszacsinálni.`,
      [
        { text: "Mégsem", style: "cancel" },
        { text: "Visszavonom", style: "destructive", onPress: () => withdraw(app.id) },
      ],
    );
  }

  async function withdraw(id: string) {
    setBusyId(id);
    try {
      await withdrawApplication(id);
      reload();
    } catch (err) {
      // 409: a státusz közben megváltozott (pl. a menhely elbírálás alá vette).
      // A szerver üzenete pontosabb, mint bármi, amit itt kitalálnánk.
      Alert.alert(
        "Nem sikerült visszavonni",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
      reload();
    } finally {
      setBusyId(null);
    }
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <ListState
          loading={false} error={null} empty
          emptyTitle="Nincs bejelentkezve"
          emptyDescription="A kérelmeid megtekintéséhez jelentkezz be."
        />
        <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} fullWidth={false} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={apps}
      keyExtractor={(a) => a.id}
      contentContainerStyle={[styles.content, apps.length === 0 && styles.emptyContent]}
      refreshControl={
        <RefreshControl refreshing={loading && apps.length > 0} onRefresh={reload} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <ListState
          loading={loading} error={error} empty={!loading && !error}
          emptyTitle="Még nincs kérelmed"
          emptyDescription="Ha megtetszik egy állat, a menhely meghívót küld a kérvény kitöltéséhez."
          onRetry={reload}
        />
      }
      renderItem={({ item }) => {
        const status = STATUS[item.status] ?? { label: item.status, bg: "#F3F4F6", fg: "#4B5563" };
        const image  = item.animal.images.find((i) => i.isPrimary) ?? item.animal.images[0];

        return (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/animals/${item.animal.id}`)}
            >
              {image
                ? <Image source={{ uri: image.url }} style={styles.img} />
                : <View style={[styles.img, styles.placeholder]} />}
              <View style={styles.info}>
                <Text style={styles.name}>{item.animal.name}</Text>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString("hu-HU")}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.fg }]}>{status.label}</Text>
              </View>
            </TouchableOpacity>

            {/* Visszavonni csak függőben lévőt lehet (US-03-F). */}
            {item.status === "PENDING" && (
              <Button
                title="Visszavonom"
                variant="ghost"
                loading={busyId === item.id}
                onPress={() => confirmWithdraw(item)}
                style={styles.withdraw}
              />
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.lg, gap: spacing.md },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  centered:     { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.md },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
  row:  { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  img:  { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  placeholder: { backgroundColor: colors.primarySoft },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  date: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  badge:     { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  withdraw:  { borderTopWidth: 1, borderTopColor: colors.border, borderRadius: 0 },
});
