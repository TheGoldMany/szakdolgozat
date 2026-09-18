import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ApiError, getConnections, removeConnection, respondToConnection,
  type ConnectionPerson,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { PersonRow } from "@/components/ui/PersonRow";
import { EmptyState, ErrorState, Loading } from "@/components/ui/ScreenState";
import { colors, spacing } from "@/components/ui/theme";

/**
 * Ismerősök.
 *
 * Három lista egy képernyőn: elfogadott, érkezett jelölés, elküldött jelölés.
 * Az ÉRKEZETT van legelöl, mert az az egyetlen, ami választ vár — ha alul
 * lenne, a felhasználó nem venné észre, hogy tennie kellene valamit.
 *
 * A művelet után teljes újratöltés jön, nem helyi állapotjavítás: egy elfogadás
 * két listát is megváltoztat (kikerül az érkezettekből, bekerül az
 * elfogadottakba), és ezt fejben tartani hibalehetőség. A lista rövid, a
 * lekérés olcsó.
 */
export default function ConnectionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi(
    useCallback(() => getConnections(), [user?.id]),
    [user?.id],
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  // Keresésből visszatérve az új jelölés is látszódjon.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  async function run(connectionId: string, fn: () => Promise<unknown>) {
    setBusyId(connectionId);
    try {
      await fn();
      reload();
    } catch (err) {
      Alert.alert(
        "Nem sikerült",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function confirmRemove(person: ConnectionPerson, label: string) {
    Alert.alert(
      label,
      `${person.name ?? "Ez a felhasználó"} kikerül a listádból.`,
      [
        { text: "Mégsem", style: "cancel" },
        {
          text: "Igen", style: "destructive",
          onPress: () => run(person.connectionId, () => removeConnection(person.connectionId)),
        },
      ],
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="Jelentkezz be"
          description="Az ismerőseidet bejelentkezve látod."
        />
        <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} />
      </View>
    );
  }

  if (loading && !data) return <Loading label="Ismerősök betöltése…" />;
  if (error && !data)   return <ErrorState error={error} onRetry={reload} />;

  const { accepted = [], incoming = [], outgoing = [] } = data ?? {};

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={colors.primary} />}
    >
      <Button title="Emberek keresése" onPress={() => router.push("/connections/search")} />

      {incoming.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Válaszra vár ({incoming.length})</Text>
          {incoming.map((p) => (
            <PersonRow key={p.connectionId} person={p}>
              <View style={styles.actions}>
                <Button
                  title="Elfogadom"
                  fullWidth={false}
                  loading={busyId === p.connectionId}
                  onPress={() => run(p.connectionId, () => respondToConnection(p.connectionId, "accept"))}
                  style={styles.action}
                />
                <Button
                  title="Elutasítom"
                  variant="outline"
                  fullWidth={false}
                  loading={busyId === p.connectionId}
                  onPress={() => run(p.connectionId, () => respondToConnection(p.connectionId, "decline"))}
                  style={styles.action}
                />
              </View>
            </PersonRow>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Ismerőseim ({accepted.length})</Text>
      {accepted.length === 0
        ? <Text style={styles.empty}>Még nincs ismerősöd. Keress rá valakire fent.</Text>
        : accepted.map((p) => (
            <PersonRow key={p.connectionId} person={p}>
              <Button
                title="Törlés"
                variant="ghost"
                fullWidth={false}
                loading={busyId === p.connectionId}
                onPress={() => confirmRemove(p, "Törlöd az ismerősök közül?")}
              />
            </PersonRow>
          ))}

      {outgoing.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Elküldött jelölések ({outgoing.length})</Text>
          {outgoing.map((p) => (
            <PersonRow key={p.connectionId} person={p}>
              <Button
                title="Visszavonom"
                variant="ghost"
                fullWidth={false}
                loading={busyId === p.connectionId}
                onPress={() => confirmRemove(p, "Visszavonod a jelölést?")}
              />
            </PersonRow>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered:  { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },

  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5,
    marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  empty: { fontSize: 13, color: colors.textFaint },


  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  action:  { flex: 1 },
});
