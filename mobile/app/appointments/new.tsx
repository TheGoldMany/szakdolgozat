import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Field, colors, radius, spacing } from "@/components/ui";
import { ApiError, requestAppointment } from "@/lib/api";

/**
 * Időpontfoglalás (docs/05-appointments.md, US-05-A).
 *
 * MIÉRT NINCS NAPTÁR-VEZÉRLŐ: a React Native-ban nincs beépített dátum- és
 * időválasztó, ahhoz külön függőség kellene
 * (@react-native-community/datetimepicker). Itt viszont nem szabad dátumot
 * választani: csak a következő két hét jöhet szóba, és a menhelyek egész
 * órákban fogadnak. Egy szabad dátumválasztó ennél többet engedne, és a
 * felhasználónak kellene kitalálnia, mi elfogadható.
 *
 * A napok és órák gombként jelennek meg, és a lista már eleve csak jövőbeli
 * időpontot tartalmaz — így a docs/05 „csak jövőbeli dátum" feltétele nem
 * validációs szabály, hanem abból következik, mit lehet egyáltalán
 * megnyomni.
 */
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const DAYS_AHEAD = 14;

export default function NewAppointmentScreen() {
  const router = useRouter();
  const { shelterId, animalId, animalName, shelterName } =
    useLocalSearchParams<{ shelterId: string; animalId?: string; animalName?: string; shelterName?: string }>();

  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [hour, setHour]         = useState<number | null>(null);
  const [note, setNote]         = useState("");
  const [sending, setSending]   = useState(false);

  /** A következő 14 nap, a mai nappal kezdve. */
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  /**
   * Ma csak a MÁR ELMÚLT órák esnek ki.
   *
   * Enélkül ma reggel 9-re lehetne foglalni délután — a szerver ezt elfogadná
   * (csak ISO-formátumot vár), és a menhely kapna egy értelmetlen kérést.
   */
  const availableHours = useMemo(() => {
    if (dayIndex === null) return HOURS;
    const chosen = days[dayIndex];
    const now = new Date();
    const isToday = chosen.toDateString() === now.toDateString();
    return isToday ? HOURS.filter((h) => h > now.getHours()) : HOURS;
  }, [dayIndex, days]);

  const ready = dayIndex !== null && hour !== null;

  async function submit() {
    if (!ready || !shelterId) return;
    const when = new Date(days[dayIndex!]);
    when.setHours(hour!, 0, 0, 0);

    setSending(true);
    try {
      await requestAppointment({
        shelterId: String(shelterId),
        animalId:  animalId ? String(animalId) : undefined,
        // A szerver ISO-8601-et vár; a helyi formátumot elutasítaná.
        proposedAt: when.toISOString(),
        note: note.trim() || undefined,
      });
      Alert.alert(
        "Időpontkérés elküldve",
        "A menhely visszaigazolja, és értesítést kapsz róla.",
      );
      router.replace("/appointments");
    } catch (err) {
      Alert.alert(
        "Nem sikerült a foglalás",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        {animalName ? `${animalName} meglátogatása` : "Látogatás"}
        {shelterName ? ` – ${shelterName}` : ""}
      </Text>

      <Text style={styles.label}>Nap</Text>
      <View style={styles.chips}>
        {days.map((d, i) => {
          const selected = dayIndex === i;
          return (
            <TouchableOpacity
              key={d.toISOString()}
              onPress={() => { setDayIndex(i); setHour(null); }}
              style={[styles.chip, selected && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipDay, selected && styles.chipTextOn]}>
                {d.toLocaleDateString("hu-HU", { weekday: "short" })}
              </Text>
              <Text style={[styles.chipDate, selected && styles.chipTextOn]}>
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Időpont</Text>
      {dayIndex === null ? (
        <Text style={styles.hint}>Előbb válassz napot.</Text>
      ) : availableHours.length === 0 ? (
        <Text style={styles.hint}>Mára már nincs szabad időpont. Válassz másik napot.</Text>
      ) : (
        <View style={styles.chips}>
          {availableHours.map((h) => {
            const selected = hour === h;
            return (
              <TouchableOpacity
                key={h}
                onPress={() => setHour(h)}
                style={[styles.hourChip, selected && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipDate, selected && styles.chipTextOn]}>
                  {String(h).padStart(2, "0")}:00
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.noteWrap}>
        <Field
          label="Megjegyzés"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={1000}
          placeholder="Bármi, amit a menhelynek tudnia érdemes…"
          hint="Nem kötelező."
        />
      </View>

      <Button
        title="Időpont kérése"
        onPress={submit}
        loading={sending}
        disabled={!ready}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },
  lead:      { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
  label:     { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  hint:      { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
  chips:     { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    width: 52, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: "center",
  },
  hourChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDay:    { fontSize: 11, color: colors.textMuted, textTransform: "uppercase" },
  chipDate:   { fontSize: 15, fontWeight: "700", color: colors.text },
  chipTextOn: { color: "#fff" },
  noteWrap:   { marginTop: spacing.xs },
});
