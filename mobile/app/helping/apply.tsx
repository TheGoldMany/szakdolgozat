import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ANIMAL_TYPES, ApiError, applyAsFoster, applyAsVolunteer,
  getMyFostering, getMyVolunteering, getShelters,
  type AnimalTypeValue, type Shelter,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { ANIMAL_TYPE_LABELS } from "@/lib/helping";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ErrorState, Loading } from "@/components/ui/ScreenState";
import { colors, radius, spacing } from "@/components/ui/theme";

/**
 * Jelentkezés önkéntesnek vagy ideiglenes befogadónak.
 *
 * EGY ŰRLAP KÉT MÓDDAL, nem két képernyő: a menhelyválasztás, a motiváció és a
 * beküldés azonos; csak a mód-specifikus mezők térnek el. Két fájlban ez a
 * közös rész duplikálódna, és a javítás egyikből kimaradna.
 *
 * MIÉRT SZŰRJÜK A MENHELYEKET: menhelyenként EGY jelentkezés lehet, a szerver
 * a másodikra 409-et ad. A már jelentkezett menhelyeket ezért kivesszük a
 * listából — jobb, mint hagyni kiválasztani, aztán hibát mutatni.
 */
export default function HelpingApplyScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isFoster = mode === "foster";
  const router = useRouter();

  const { data, error, loading, reload } = useApi(
    useCallback(async () => {
      const [shelters, mine] = await Promise.all([
        getShelters(),
        isFoster ? getMyFostering() : getMyVolunteering(),
      ]);
      // A `/api/volunteers` és a `/api/foster` a menhelyet `{ name, city,
      // slug }` alakban adja, AZONOSÍTÓ NÉLKÜL — ezért slug alapján zárjuk ki
      // a már megjelölt menhelyeket, nem azonosító alapján.
      const takenSlugs = new Set(mine.map((m) => m.shelter.slug));
      return { shelters, takenSlugs };
    }, [isFoster]),
    [isFoster],
  );

  const [shelterId, setShelterId] = useState<string | null>(null);
  const [motivation, setMotivation] = useState("");
  // Önkéntes mezők
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("");
  // Befogadó mezők
  const [types, setTypes] = useState<AnimalTypeValue[]>([]);
  const [maxWeight, setMaxWeight] = useState("");
  const [canQuarantine, setCanQuarantine] = useState(false);
  const [busy, setBusy] = useState(false);

  const available = useMemo(
    () => (data ? data.shelters.filter((s) => !data.takenSlugs.has(s.slug)) : []),
    [data],
  );

  function toggleType(type: AnimalTypeValue) {
    setTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  }

  async function submit() {
    if (!shelterId) {
      Alert.alert("Válassz menhelyet", "Meg kell adnod, melyik menhelyhez jelentkezel.");
      return;
    }

    let weight: number | undefined;
    if (isFoster && maxWeight.trim()) {
      weight = Number(maxWeight.replace(",", "."));
      // A szerver pozitív, legfeljebb 200 kg értéket fogad el.
      if (!Number.isFinite(weight) || weight <= 0 || weight > 200) {
        Alert.alert("Érvénytelen súly", "0 és 200 kg közötti számot adj meg.");
        return;
      }
    }

    setBusy(true);
    try {
      if (isFoster) {
        await applyAsFoster({
          shelterId,
          // Üres lista = bármilyen állat; ezt a séma is így érti.
          preferredTypes: types,
          maxWeightKg:    weight,
          canQuarantine,
          motivation:     motivation.trim() || undefined,
        });
      } else {
        await applyAsVolunteer({
          shelterId,
          motivation:   motivation.trim() || undefined,
          skills:       skills.trim() || undefined,
          availability: availability.trim() || undefined,
        });
      }
      Alert.alert(
        "Jelentkezés elküldve",
        "A menhely értesítést kapott. A válaszról értesítést küldünk.",
      );
      router.back();
    } catch (err) {
      Alert.alert(
        "Nem sikerült a jelentkezés",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <Loading label="Menhelyek betöltése…" />;
  if (error && !data)   return <ErrorState error={error} onRetry={reload} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        {isFoster
          ? "Az ideiglenes befogadó átmenetileg otthont ad egy állatnak, amíg gazdára talál."
          : "Az önkéntes rendszeresen segít a menhelyen: sétáltat, takarít, gondoz."}
      </Text>

      <Text style={styles.label}>Melyik menhelyhez?</Text>
      {available.length === 0 ? (
        <Text style={styles.empty}>
          Minden menhelyhez jelentkeztél már. Menhelyenként egy jelentkezés lehet.
        </Text>
      ) : (
        <View style={styles.shelterList}>
          {available.map((s) => (
            <ShelterOption
              key={s.id}
              shelter={s}
              selected={shelterId === s.id}
              onPress={() => setShelterId(s.id)}
            />
          ))}
        </View>
      )}

      {isFoster ? (
        <>
          <Text style={styles.label}>Milyen állatot vállalnál?</Text>
          <Text style={styles.hint}>
            Ha egyiket sem jelölöd be, azt jelenti: bármilyen állatot.
          </Text>
          <View style={styles.chips}>
            {ANIMAL_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => toggleType(t)}
                style={[styles.chip, types.includes(t) && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: types.includes(t) }}
              >
                <Text style={[styles.chipText, types.includes(t) && styles.chipTextOn]}>
                  {ANIMAL_TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Field
            label="Legfeljebb hány kg? (nem kötelező)"
            value={maxWeight}
            onChangeText={setMaxWeight}
            keyboardType="decimal-pad"
            hint="Üresen hagyva nincs súlykorlát."
          />

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>Tudok karantént biztosítani</Text>
              <Text style={styles.hint}>
                Külön helyiség, ahol a beteg vagy újonnan érkezett állat elkülöníthető.
              </Text>
            </View>
            <Switch
              value={canQuarantine}
              onValueChange={setCanQuarantine}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </>
      ) : (
        <>
          <Field
            label="Amiben segítenél (nem kötelező)"
            value={skills}
            onChangeText={setSkills}
            placeholder="Pl. kutyasétáltatás, takarítás, fotózás"
            maxLength={500}
          />
          <Field
            label="Mikor érsz rá? (nem kötelező)"
            value={availability}
            onChangeText={setAvailability}
            placeholder="Pl. hétvégente délelőtt"
            maxLength={200}
          />
        </>
      )}

      <Field
        label="Miért jelentkezel? (nem kötelező)"
        value={motivation}
        onChangeText={setMotivation}
        multiline
        maxLength={2000}
      />

      <Button
        title="Jelentkezés elküldése"
        loading={busy}
        disabled={available.length === 0}
        onPress={submit}
      />
    </ScrollView>
  );
}

function ShelterOption({
  shelter, selected, onPress,
}: { shelter: Shelter; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.shelter, selected && styles.shelterOn]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {/* A kiválasztást nem csak a keretszín jelzi: a pipa akkor is látszik,
          ha a színkülönbség nem érzékelhető. */}
      <Text style={styles.check}>{selected ? "✓" : " "}</Text>
      <View style={styles.shelterText}>
        <Text style={styles.shelterName}>{shelter.name}</Text>
        <Text style={styles.shelterCity}>{shelter.city}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },

  intro: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  hint:  { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 17 },
  empty: { fontSize: 13, color: colors.textFaint, marginBottom: spacing.lg },

  shelterList: { marginBottom: spacing.lg, gap: 6 },
  shelter: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  shelterOn:   { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  check:       { width: 16, fontSize: 15, fontWeight: "700", color: colors.primary },
  shelterText: { flex: 1 },
  shelterName: { fontSize: 14, fontWeight: "600", color: colors.text },
  shelterCity: { fontSize: 12, color: colors.textMuted },

  chips:      { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, minHeight: 36, justifyContent: "center",
  },
  chipOn:      { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:    { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  chipTextOn:  { color: "#fff" },

  switchRow:  { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  switchText: { flex: 1 },
  switchLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
});
