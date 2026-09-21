import { useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getMyFostering, getMyVolunteering, type FosterRecord, type VolunteerRecord } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";
import { HELP_STATUS_COLORS, HELP_STATUS_LABELS, preferredTypesLabel } from "@/lib/helping";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, Loading } from "@/components/ui/ScreenState";
import { colors, radius, spacing } from "@/components/ui/theme";

/**
 * Önkénteskedés és ideiglenes befogadás egy képernyőn.
 *
 * MIÉRT EGYÜTT: a két dolog ugyanaz a szándék — „segítenék ennek a menhelynek"
 * —, csak más mértékben. Két külön menüpont mögött a felhasználónak előre
 * tudnia kellene, melyiket keresi; így egy helyen látja mindkettőt, és azt is,
 * hogy melyikre jelentkezett már.
 *
 * A két lista KÉT végpontról jön (`/api/volunteers` és `/api/foster`),
 * párhuzamosan — egymásra nem várnak.
 */
export default function HelpingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const { data, error, loading, reload } = useApi(
    useCallback(async () => {
      const [volunteering, fostering] = await Promise.all([
        getMyVolunteering(),
        getMyFostering(),
      ]);
      return { volunteering, fostering };
    }, [user?.id]),
    [user?.id],
  );

  // Jelentkezés után visszatérve frissüljön: az új sor különben csak a
  // következő indításkor jelenne meg.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  if (!user) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="Jelentkezz be"
          description="Az önkéntes és befogadói jelentkezéseidet bejelentkezve látod."
        />
        <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} />
      </View>
    );
  }

  if (loading && !data) return <Loading label="Betöltés…" />;
  if (error && !data)   return <ErrorState error={error} onRetry={reload} />;

  const volunteering = data?.volunteering ?? [];
  const fostering    = data?.fostering ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={colors.primary} />}
    >
      <Text style={styles.sectionTitle}>Önkéntesség</Text>
      {volunteering.length === 0
        ? <Text style={styles.empty}>Még nem jelentkeztél önkéntesnek.</Text>
        : volunteering.map((v) => <VolunteerCard key={v.id} record={v} />)}
      <Button
        title="Jelentkezés önkéntesnek"
        variant="outline"
        onPress={() => router.push("/helping/apply?mode=volunteer")}
      />

      <Text style={[styles.sectionTitle, styles.secondSection]}>Ideiglenes befogadás</Text>
      {fostering.length === 0
        ? <Text style={styles.empty}>Még nem jelentkeztél befogadónak.</Text>
        : fostering.map((f) => <FosterCard key={f.id} record={f} />)}
      <Button
        title="Jelentkezés befogadónak"
        variant="outline"
        onPress={() => router.push("/helping/apply?mode=foster")}
      />
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = HELP_STATUS_COLORS[status] ?? HELP_STATUS_COLORS.INACTIVE;
  return (
    <Text style={[styles.badge, { backgroundColor: color.bg, color: color.fg }]}>
      {HELP_STATUS_LABELS[status] ?? status}
    </Text>
  );
}

function VolunteerCard({ record }: { record: VolunteerRecord }) {
  // Csak a még aktuális feladatok érdekesek: a lezártak és a lemondottak a
  // telefonon csak görgetnivalók lennének. A séma szerinti négy érték:
  // OPEN | ASSIGNED | COMPLETED | CANCELLED.
  const openTasks = record.assignments.filter(
    (a) => a.task.status === "OPEN" || a.task.status === "ASSIGNED",
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{record.shelter.name}</Text>
        <StatusBadge status={record.status} />
      </View>
      <Text style={styles.cardSub}>{record.shelter.city}</Text>

      {!!record.availability && (
        <Text style={styles.detail}>Ráérek: {record.availability}</Text>
      )}
      {!!record.skills && <Text style={styles.detail}>Amiben segítek: {record.skills}</Text>}

      {openTasks.length > 0 && (
        <View style={styles.tasks}>
          <Text style={styles.tasksTitle}>Felvett feladataim</Text>
          {openTasks.map((a) => (
            <Text key={a.id} style={styles.task}>
              • {a.task.title}
              {a.task.scheduledAt
                ? ` — ${new Date(a.task.scheduledAt).toLocaleDateString("hu-HU")}`
                : ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function FosterCard({ record }: { record: FosterRecord }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{record.shelter.name}</Text>
        <StatusBadge status={record.status} />
      </View>
      <Text style={styles.cardSub}>{record.shelter.city}</Text>

      <Text style={styles.detail}>Vállalom: {preferredTypesLabel(record.preferredTypes)}</Text>
      {record.maxWeightKg != null && (
        <Text style={styles.detail}>Legfeljebb {record.maxWeightKg} kg</Text>
      )}
      {record.canQuarantine && <Text style={styles.detail}>Tudok karantént biztosítani</Text>}

      {record.fosteredAnimals.length > 0 && (
        <View style={styles.tasks}>
          <Text style={styles.tasksTitle}>Nálam lévő állatok</Text>
          {record.fosteredAnimals.map((a) => (
            <Text key={a.id} style={styles.task}>• {a.name}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  centered:  { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },

  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.xs,
  },
  secondSection: { marginTop: spacing.xl },
  empty: { fontSize: 13, color: colors.textFaint, marginBottom: spacing.xs },

  card:      { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  cardHead:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  cardSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  detail:    { fontSize: 13, color: colors.text, marginTop: 6 },

  badge: {
    fontSize: 11, fontWeight: "600",
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill, overflow: "hidden",
  },

  tasks:      { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  tasksTitle: { fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 4 },
  task:       { fontSize: 13, color: colors.text, marginTop: 2 },
});
