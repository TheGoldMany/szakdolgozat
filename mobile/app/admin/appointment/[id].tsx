import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ApiError, completeAppointment, confirmAppointment,
  getAppointment, rejectAppointment,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ErrorState, Loading } from "@/components/ui/ScreenState";
import { colors, radius, spacing } from "@/components/ui/theme";

/**
 * Időpont visszaigazolása — menhelyi adminnak.
 *
 * EZ A LEGINDOKOLTABB ADMIN FUNKCIÓ A TELEFONON: valaki egy konkrét napra és
 * órára szeretne bejönni, és amíg nincs válasz, mindkét fél bizonytalanságban
 * van. Egy koppintás, és a kérelmező azonnal értesítést kap.
 *
 * A VISSZAIGAZOLÁS IDŐPONTOT IS JELENT, nem csak rábólintást: a szerver
 * kötelező `confirmedAt` mezőt vár. Alapból a KÉRT időpontot ajánljuk fel —
 * az esetek nagy részében ez a helyes, és így egy koppintás az egész. Ha a
 * menhely mást akar, a megjegyzésben egyeztethet, az időpont áthelyezését
 * pedig a webes vezérlőpult végzi.
 */

const STATUS_LABELS: Record<string, string> = {
  PENDING:   "Visszaigazolásra vár",
  CONFIRMED: "Visszaigazolva",
  CANCELLED: "Lemondva",
  COMPLETED: "Lezárult",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("hu-HU", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: appt, error, loading, reload } = useApi(
    useCallback(() => getAppointment(String(id)), [id]),
    [id],
  );

  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, back = true) {
    setBusy(true);
    try {
      await fn();
      reload();
      if (back) router.back();
    } catch (err) {
      Alert.alert(
        "Nem sikerült",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmReject() {
    Alert.alert(
      "Elutasítod az időpontot?",
      "A kérelmező értesítést kap. Ha írtál megjegyzést, azt is megkapja.",
      [
        { text: "Mégsem", style: "cancel" },
        {
          text: "Elutasítom", style: "destructive",
          onPress: () => run(() => rejectAppointment(String(id), note.trim() || undefined)),
        },
      ],
    );
  }

  if (loading && !appt) return <Loading label="Időpont betöltése…" />;
  if (error && !appt)   return <ErrorState error={error} onRetry={reload} />;
  if (!appt)            return <ErrorState error={new Error("Az időpont nem található.")} />;

  const pending   = appt.status === "PENDING";
  const confirmed = appt.status === "CONFIRMED";
  const past      = new Date(appt.confirmedAt ?? appt.proposedAt) < new Date();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{appt.animal?.name ?? "Általános látogatás"}</Text>
      <Text style={styles.status}>{STATUS_LABELS[appt.status] ?? appt.status}</Text>

      <View style={styles.box}>
        <Row label="Kért időpont" value={formatDateTime(appt.proposedAt)} />
        {!!appt.confirmedAt && <Row label="Visszaigazolva" value={formatDateTime(appt.confirmedAt)} />}
        <Row label="Kérelmező" value={appt.user?.name ?? appt.user?.email ?? "Ismeretlen"} />
        {!!appt.note && <Row label="Megjegyzése" value={appt.note} />}
      </View>

      {!!appt.user?.email && (
        <Button
          title="E-mail a kérelmezőnek"
          variant="outline"
          onPress={() => Linking.openURL(`mailto:${appt.user!.email}`)}
        />
      )}

      {pending && (
        <View style={styles.actions}>
          <Field
            label="Megjegyzés (a kérelmező is látja)"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
          />
          <Button
            title="Visszaigazolom a kért időpontra"
            loading={busy}
            onPress={() => run(() =>
              confirmAppointment(String(id), appt.proposedAt, note.trim() || undefined))}
          />
          <Button title="Elutasítom" variant="danger" loading={busy} onPress={confirmReject} />
        </View>
      )}

      {/* A lezárás csak a MEGTÖRTÉNT látogatásnál van kint: egy jövőbeli
          időpontot lezárni értelmetlen, és véletlenül könnyű rábökni. */}
      {confirmed && past && (
        <View style={styles.actions}>
          <Button
            title="Megtörtént – lezárom"
            variant="outline"
            loading={busy}
            onPress={() => run(() => completeAppointment(String(id)), false)}
          />
        </View>
      )}

      {confirmed && !past && (
        <Text style={styles.hint}>
          Az időpont vissza van igazolva. A látogatás után itt tudod lezárni.
        </Text>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },

  title:  { fontSize: 22, fontWeight: "700", color: colors.text },
  status: { fontSize: 13, color: colors.primary, fontWeight: "600", marginTop: 2, marginBottom: spacing.lg },

  box: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  row:      { flexDirection: "row", gap: spacing.md, marginBottom: 4 },
  rowLabel: { width: 110, fontSize: 12, color: colors.textMuted },
  rowValue: { flex: 1, fontSize: 13, color: colors.text },

  actions: { marginTop: spacing.lg, gap: spacing.sm },
  hint:    { fontSize: 13, color: colors.textMuted, marginTop: spacing.lg, textAlign: "center" },
});
