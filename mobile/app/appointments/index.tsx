import { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, ListState, colors, radius, spacing } from "@/components/ui";
import { ApiError, cancelAppointment, getMyAppointments, type Appointment } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";

/** Az időpont életciklusa a docs/05-appointments.md szerint. */
const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING:   { label: "Visszaigazolásra vár", bg: "#FEF3C7", fg: "#92400E" },
  CONFIRMED: { label: "Visszaigazolva",       bg: "#D1FAE5", fg: "#065F46" },
  REJECTED:  { label: "Elutasítva",           bg: "#FEE2E2", fg: "#991B1B" },
  CANCELLED: { label: "Lemondva",             bg: "#F3F4F6", fg: "#4B5563" },
  COMPLETED: { label: "Megtörtént",           bg: "#DBEAFE", fg: "#1E40AF" },
};

/** Csak a még élő időpontot van értelme lemondani (US-05-E). */
const CANCELLABLE = new Set(["PENDING", "CONFIRMED"]);

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetcher = useCallback(() => getMyAppointments(), [user?.id]);
  const { data, error, loading, reload } = useApi<Appointment[]>(fetcher, [user?.id]);
  const items = data ?? [];

  function confirmCancel(appt: Appointment) {
    Alert.alert(
      "Időpont lemondása",
      "Biztosan lemondod ezt az időpontot? A menhely értesítést kap róla.",
      [
        { text: "Mégsem", style: "cancel" },
        { text: "Lemondom", style: "destructive", onPress: () => cancel(appt.id) },
      ],
    );
  }

  async function cancel(id: string) {
    setBusyId(id);
    try {
      await cancelAppointment(id);
      reload();
    } catch (err) {
      Alert.alert(
        "Nem sikerült a lemondás",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
      // A státusz közben megváltozhatott – mutassuk a valós állapotot.
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
          emptyDescription="Az időpontjaid megtekintéséhez jelentkezz be."
        />
        <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} fullWidth={false} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(a) => a.id}
      contentContainerStyle={[styles.content, items.length === 0 && styles.emptyContent]}
      refreshControl={
        <RefreshControl refreshing={loading && items.length > 0} onRefresh={reload} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <ListState
          loading={loading} error={error} empty={!loading && !error}
          emptyTitle="Nincs foglalt időpontod"
          emptyDescription="Egy állat adatlapjáról tudsz látogatási időpontot kérni."
          onRetry={reload}
        />
      }
      renderItem={({ item }) => {
        const status = STATUS[item.status] ?? { label: item.status, bg: "#F3F4F6", fg: "#4B5563" };
        // Visszaigazolt időpontnál a menhely által megerősített időpont a
        // mérvadó, nem az, amit a felhasználó eredetileg kért.
        const when = new Date(item.confirmedAt ?? item.proposedAt);

        return (
          <View style={styles.card}>
            <View style={styles.head}>
              <View style={styles.headText}>
                <Text style={styles.when}>
                  {when.toLocaleDateString("hu-HU", { month: "long", day: "numeric", weekday: "long" })}
                  {" · "}
                  {when.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Text style={styles.where}>
                  {item.shelter.name} · {item.shelter.city}
                </Text>
                {!!item.animal && (
                  <Text style={styles.animal}>{item.animal.name}</Text>
                )}
              </View>
              <View style={[styles.badge, { backgroundColor: status.bg }]}>
                <Text style={[styles.badgeText, { color: status.fg }]}>{status.label}</Text>
              </View>
            </View>

            {!!item.note && <Text style={styles.note}>{item.note}</Text>}

            {CANCELLABLE.has(item.status) && (
              <Button
                title="Lemondom"
                variant="ghost"
                loading={busyId === item.id}
                onPress={() => confirmCancel(item)}
                style={styles.cancel}
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
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md },
  headText: { flex: 1 },
  when:   { fontSize: 15, fontWeight: "700", color: colors.text },
  where:  { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  animal: { fontSize: 13, color: colors.primary, marginTop: 3, fontWeight: "600" },
  note:   { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.md, paddingBottom: spacing.md, lineHeight: 19 },
  badge:     { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cancel:    { borderTopWidth: 1, borderTopColor: colors.border, borderRadius: 0 },
});
