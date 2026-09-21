import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Field, PhotoField, colors, radius, spacing } from "@/components/ui";
import { ApiError, createReport, type ReportType } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/** A docs/09-reports-map.md szerinti három bejelentéstípus. */
const TYPES: { value: ReportType; label: string }[] = [
  { value: "LOST",  label: "Elveszett" },
  { value: "FOUND", label: "Talált" },
  { value: "STRAY", label: "Kóborló" },
];

const ANIMALS = [
  { value: "DOG",    label: "Kutya" },
  { value: "CAT",    label: "Macska" },
  { value: "RABBIT", label: "Nyúl" },
  { value: "BIRD",   label: "Madár" },
  { value: "OTHER",  label: "Egyéb" },
];

/**
 * Új bejelentés (docs/09-reports-map.md, US-09-A).
 *
 * MIÉRT ITT A LEGFONTOSABB A FOTÓZÁS: a bejelentő a helyszínen áll az
 * állattal szemben. A weben ehhez előbb fotózni kell, átvinni a képet egy
 * másik eszközre, és utólag feltölteni — mire ez megtörténik, az állat gyakran
 * már nincs ott. Ezért a kamera az űrlap tetején van, nem az aljára rejtve.
 *
 * A kötelező mezőket a szerver zod-sémája határozza meg; itt ugyanazokat
 * kérjük be, hogy a felhasználó ne a beküldéskor szembesüljön a hiánnyal.
 */
export default function NewReportScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [type, setType]           = useState<ReportType>("LOST");
  const [animalType, setAnimal]   = useState("DOG");
  const [images, setImages]       = useState<string[]>([]);
  const [description, setDesc]    = useState("");
  const [city, setCity]           = useState("");
  const [address, setAddress]     = useState("");
  const [contactName, setName]    = useState(user?.name ?? "");
  const [contactPhone, setPhone]  = useState("");
  const [contactEmail, setEmail]  = useState(user?.email ?? "");
  const [touched, setTouched]     = useState(false);
  const [sending, setSending]     = useState(false);

  // A szerver sémájából: description ≥ 10, contactName ≥ 2, a többi nem üres.
  const errors = {
    description:  description.trim().length < 10 ? "Legalább 10 karakter szükséges." : null,
    city:         city.trim() ? null : "Kötelező mező.",
    contactName:  contactName.trim().length < 2 ? "Legalább 2 karakter." : null,
    contactPhone: contactPhone.trim() ? null : "Kötelező mező.",
    contactEmail: /^\S+@\S+\.\S+$/.test(contactEmail.trim()) ? null : "Érvénytelen e-mail.",
  };
  const valid = Object.values(errors).every((e) => e === null);

  async function submit() {
    setTouched(true);
    if (!valid) return;

    setSending(true);
    try {
      await createReport({
        type, animalType,
        description:  description.trim(),
        city:         city.trim(),
        address:      address.trim() || undefined,
        contactName:  contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        imageUrls:    images.length > 0 ? images : undefined,
      });
      Alert.alert("Bejelentés elküldve", "Köszönjük! A bejelentés megjelenik a térképen és a listában.");
      router.back();
    } catch (err) {
      Alert.alert(
        "Nem sikerült elküldeni",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setSending(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.needLogin}>A bejelentéshez be kell jelentkezned.</Text>
        <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} fullWidth={false} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* A fotó elöl: a bejelentő a helyszínen van, és ez a legértékesebb adat. */}
        <PhotoField
          label="Fotó az állatról"
          urls={images}
          onChange={setImages}
          max={6}
          hint="Legfeljebb 6 kép. A fotó sokat segít az azonosításban."
        />

        <Text style={styles.label}>Mi történt?</Text>
        <View style={styles.chips}>
          {TYPES.map((t) => (
            <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
          ))}
        </View>

        <Text style={styles.label}>Milyen állat?</Text>
        <View style={styles.chips}>
          {ANIMALS.map((a) => (
            <Chip key={a.value} label={a.label} selected={animalType === a.value} onPress={() => setAnimal(a.value)} />
          ))}
        </View>

        <Field
          label="Leírás *" value={description} onChangeText={setDesc} multiline maxLength={2000}
          placeholder="Hol, mikor, hogyan nézett ki…"
          error={touched ? errors.description : null}
          hint="Legalább 10 karakter."
        />
        <Field
          label="Város *" value={city} onChangeText={setCity} maxLength={100}
          error={touched ? errors.city : null}
        />
        <Field
          label="Pontos hely" value={address} onChangeText={setAddress} maxLength={200}
          hint="Nem kötelező, de segít a keresésben."
        />

        <Text style={styles.section}>Elérhetőség</Text>
        <Field
          label="Név *" value={contactName} onChangeText={setName} maxLength={100}
          error={touched ? errors.contactName : null}
        />
        <Field
          label="Telefonszám *" value={contactPhone} onChangeText={setPhone} maxLength={20}
          keyboardType="phone-pad" error={touched ? errors.contactPhone : null}
        />
        <Field
          label="E-mail *" value={contactEmail} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" autoComplete="email"
          error={touched ? errors.contactEmail : null}
        />

        <Button title="Bejelentés elküldése" onPress={submit} loading={sending} style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered:  { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.lg },
  needLogin: { fontSize: 15, color: colors.textMuted, textAlign: "center" },

  label:   { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 8 },
  section: { fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  chips:   { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:   { fontSize: 14, color: colors.text, fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  submit:     { marginTop: spacing.md },
});
