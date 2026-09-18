import { useCallback, useState } from "react";
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ApiError, cancelEventRegistration, getEvent, registerForEvent,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";
import {
  canRegister, EVENT_STATUS_LABELS, EVENT_TYPE_LABELS,
  formatEventDate, freeSpots, isRegistered,
} from "@/lib/events";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ErrorState, Loading } from "@/components/ui/ScreenState";
import { colors, radius, spacing } from "@/components/ui/theme";

/**
 * Esemény részletei és jelentkezés.
 *
 * Az útvonal paramétere azonosító VAGY slug lehet: a listából azonosítóval
 * jövünk, egy értesítésből viszont slug (`/events/{slug}`) érkezik. A végpont
 * mindkettőt elfogadja, a jelentkezéshez viszont az `event.id` kell — ezért
 * dolgozunk a betöltött esemény azonosítójával, nem az útvonaléval.
 */
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data, error, loading, reload } = useApi(
    useCallback(() => getEvent(String(id)), [id]),
    [id],
  );
  const event = data?.event ?? null;

  const [guests, setGuests] = useState("0");
  const [note, setNote]     = useState("");
  const [busy, setBusy]     = useState(false);

  async function submit() {
    if (!event) return;
    // A kísérők száma a szerveren 0–20 között van korlátozva; itt is
    // megfogjuk, hogy a felhasználó ne a beküldés után tudja meg.
    const count = Number(guests);
    if (!Number.isInteger(count) || count < 0 || count > 20) {
      Alert.alert("Érvénytelen kísérőszám", "0 és 20 közötti egész számot adj meg.");
      return;
    }

    setBusy(true);
    try {
      await registerForEvent(event.id, { guests: count, note: note.trim() || undefined });
      Alert.alert("Jelentkezés rögzítve", "A menhely értesítést kapott a jelentkezésedről.");
      reload();
    } catch (err) {
      Alert.alert(
        "Nem sikerült a jelentkezés",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmCancel() {
    if (!event) return;
    Alert.alert(
      "Lemondod a részvételt?",
      "A helyed felszabadul, és később újra jelentkezhetsz, ha marad hely.",
      [
        { text: "Mégsem", style: "cancel" },
        { text: "Lemondom", style: "destructive", onPress: runCancel },
      ],
    );
  }

  async function runCancel() {
    if (!event) return;
    setBusy(true);
    try {
      await cancelEventRegistration(event.id);
      reload();
    } catch (err) {
      Alert.alert(
        "Nem sikerült a lemondás",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading && !event) return <Loading label="Esemény betöltése…" />;
  if (error && !event)   return <ErrorState error={error} onRetry={reload} />;
  if (!event)            return <ErrorState error={new Error("Az esemény nem található.")} />;

  const free       = freeSpots(event);
  const registered = isRegistered(event);
  const open       = canRegister(event);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!!event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.image} />}

      <Text style={styles.type}>{EVENT_TYPE_LABELS[event.type] ?? event.type}</Text>
      <Text style={styles.title}>{event.title}</Text>

      {/* A lemondott esemény ELÉRHETŐ marad, mert aki jelentkezett rá,
          értesítést kapott egy hivatkozással — 404 helyett lássa, mi történt. */}
      {event.status !== "PUBLISHED" && (
        <Text style={styles.statusWarning}>
          {EVENT_STATUS_LABELS[event.status] ?? event.status}
        </Text>
      )}

      <View style={styles.infoBox}>
        <Row label="Mikor" value={formatEventDate(event.startsAt)} />
        {!!event.endsAt && <Row label="Vége" value={formatEventDate(event.endsAt)} />}
        <Row label="Hol" value={event.location} />
        <Row label="Szervező" value={`${event.shelter.name} (${event.shelter.city})`} />
        <Row
          label="Jelentkezők"
          value={free === null
            ? `${event._count.registrations} fő`
            : `${event._count.registrations} fő · ${free} szabad hely`}
        />
      </View>

      <Text style={styles.description}>{event.description}</Text>

      <Button
        title="Útvonal megnyitása"
        variant="outline"
        onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(event.location)}`)}
      />

      <View style={styles.actions}>
        {!user ? (
          <>
            <Text style={styles.hint}>A jelentkezéshez be kell jelentkezned.</Text>
            <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} />
          </>
        ) : registered ? (
          <>
            <Text style={styles.registered}>
              Jelentkeztél erre az eseményre
              {event.registration!.guests > 0 && ` (+${event.registration!.guests} kísérő)`}.
            </Text>
            <Button
              title="Részvétel lemondása"
              variant="danger"
              loading={busy}
              onPress={confirmCancel}
            />
          </>
        ) : !open ? (
          <Text style={styles.hint}>
            {free === 0 ? "Az esemény betelt." : "Erre az eseményre már nem lehet jelentkezni."}
          </Text>
        ) : (
          <>
            <Field
              label="Kísérők száma"
              value={guests}
              onChangeText={setGuests}
              keyboardType="number-pad"
              hint="Rajtad kívül hányan jönnek. Legfeljebb 20."
            />
            <Field
              label="Megjegyzés (nem kötelező)"
              value={note}
              onChangeText={setNote}
              multiline
            />
            <Button title="Jelentkezem" loading={busy} onPress={submit} />
          </>
        )}
      </View>
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

  image: { width: "100%", height: 180, borderRadius: radius.lg, marginBottom: spacing.lg, backgroundColor: colors.primarySoft },
  type:  { fontSize: 12, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 4, marginBottom: spacing.md },

  statusWarning: {
    fontSize: 13, fontWeight: "700", color: colors.dangerDark,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, overflow: "hidden",
  },

  infoBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  row:      { flexDirection: "row", gap: spacing.md, marginBottom: 6 },
  rowLabel: { width: 96, fontSize: 12, color: colors.textMuted },
  rowValue: { flex: 1, fontSize: 13, color: colors.text },

  description: { fontSize: 14, lineHeight: 21, color: colors.text, marginBottom: spacing.lg },

  actions:    { marginTop: spacing.xl, gap: spacing.sm },
  hint:       { fontSize: 13, color: colors.textMuted, textAlign: "center" },
  registered: { fontSize: 14, color: "#065F46", fontWeight: "600", textAlign: "center" },
});
