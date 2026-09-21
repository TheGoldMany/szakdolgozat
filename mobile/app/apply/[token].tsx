import { useCallback, useState } from "react";
import {
  Alert, Image, KeyboardAvoidingView, Linking, Platform,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Field, ListState, colors, spacing, radius } from "@/components/ui";
import {
  ApiError, applyWebUrl, getApplyForm, submitApplyForm,
  type ApplyField, type ApplyForm, type ApplyResponse,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";

/**
 * Örökbefogadási kérvény – a menhely SAJÁT kérdőívével.
 *
 * A kérdéseket a szerver adja (`GET /api/apply/[token]`), nem a mobil rögzíti:
 * minden menhely maga állítja össze a kérdőívét a dashboardon. Egy lemásolt,
 * statikus űrlap az első kérdésmódosításnál elavulna, és a mobilon más kérdések
 * jelennének meg, mint a weben.
 *
 * A mezők sorrendjét is a szerver határozza meg (`order` szerint rendezve
 * érkeznek), ezért itt nem rendezünk újra.
 *
 * FÁJL- ÉS KÉPMEZŐK: ezeket a mobil jelenleg nem tölti fel, mert ahhoz
 * fájlválasztó kellene (expo-image-picker / expo-document-picker). Az új
 * függőség nemcsak csomagméret: kamerát vagy fotótárat használó appnál az iOS
 * kötelezővé teszi a usage description szövegeket, ami a store adatkezelési
 * válaszait is megváltoztatja (lásd docs/20-mobil-kiadas.md). Ezért az ilyen
 * mezőknél a webes kitöltőre irányítunk, ahol a feltöltés már működik — így a
 * folyamat végigvihető, csak nem az appon belül.
 */
export default function ApplyScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  const fetcher = useCallback(() => getApplyForm(String(token)), [token]);
  const { data: form, error, loading, reload } = useApi<ApplyForm>(fetcher, [token]);

  const [values, setValues]   = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);

  const needsUpload = (form?.fields ?? []).some((f) => f.type === "IMAGE" || f.type === "FILE");

  /** Kitöltetlen kötelező szöveges mezők – a beküldés előtt ezt jelezzük. */
  const missing = (form?.fields ?? []).filter(
    (f) => f.required && f.type !== "IMAGE" && f.type !== "FILE" && !values[f.id]?.trim(),
  );

  async function submit() {
    if (!form) return;
    setTouched(true);
    if (missing.length > 0) return;

    const responses: ApplyResponse[] = form.fields
      .filter((f) => f.type === "TEXT" || f.type === "TEXTAREA")
      .map((f) => ({ fieldId: f.id, value: values[f.id]?.trim() ?? "" }));

    setSending(true);
    try {
      await submitApplyForm(String(token), responses);
      Alert.alert(
        "Kérvény elküldve",
        "A menhely megkapta a kérvényedet. A státuszát a Kérelmeim alatt követheted.",
      );
      router.replace("/applications");
    } catch (err) {
      // A szerver a kötelező mezőket is ellenőrzi, és a hiányzó mező NEVÉT
      // adja vissza – ezért az ő üzenetét mutatjuk, nem egy általánosat.
      Alert.alert(
        "Nem sikerült elküldeni",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setSending(false);
    }
  }

  if (loading || error || !form) {
    return (
      <View style={styles.centered}>
        <ListState
          loading={loading}
          error={error}
          empty={!loading && !error && !form}
          emptyTitle="A meghívó nem érvényes"
          emptyDescription="Lehet, hogy lejárt, vagy már felhasználták."
          onRetry={reload}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Melyik állatról van szó – a kérvény önmagában nem mondaná meg. */}
        <View style={styles.animal}>
          {form.animalImage
            ? <Image source={{ uri: form.animalImage }} style={styles.animalImg} />
            : <View style={[styles.animalImg, styles.placeholder]} />}
          <View style={styles.animalText}>
            <Text style={styles.animalName}>{form.animalName}</Text>
            <Text style={styles.formTitle}>{form.formTitle}</Text>
          </View>
        </View>

        {!!form.formDescription && (
          <Text style={styles.description}>{form.formDescription}</Text>
        )}

        {form.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.id] ?? ""}
            onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
            showError={touched}
            token={String(token)}
          />
        ))}

        {needsUpload && (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Fájlt kérő kérdés</Text>
            <Text style={styles.noticeText}>
              Ez a kérdőív fájl vagy kép feltöltését is kéri, amit jelenleg a
              böngészőben tudsz megtenni. A már beírt szöveges válaszok ott újra
              kitöltendők.
            </Text>
            <Button
              title="Megnyitás böngészőben"
              variant="outline"
              onPress={() => Linking.openURL(applyWebUrl(String(token)))}
            />
          </View>
        )}

        {touched && missing.length > 0 && (
          <Text style={styles.summaryError}>
            {missing.length} kötelező mező kitöltetlen.
          </Text>
        )}

        <Button
          title="Kérvény elküldése"
          onPress={submit}
          loading={sending}
          // Fájlmezőnél a beküldés nem lenne teljes: a szerver a kötelező
          // fájlmezőt hiányzónak látná, és elutasítaná.
          disabled={needsUpload}
          style={styles.submit}
        />
        {needsUpload && (
          <Text style={styles.hint}>
            A beküldés a böngészőben folytatható, mert fájlt is kér a kérdőív.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Egy mező megjelenítése a típusa szerint. */
function FieldRenderer({
  field, value, onChange, showError, token,
}: {
  field: ApplyField;
  value: string;
  onChange: (v: string) => void;
  showError: boolean;
  token: string;
}) {
  const label = field.required ? `${field.label} *` : field.label;

  if (field.type === "IMAGE" || field.type === "FILE") {
    return (
      <View style={styles.fileField}>
        <Text style={styles.fileLabel}>{label}</Text>
        <Text style={styles.fileHint}>
          {field.type === "IMAGE" ? "Kép" : "Fájl"} feltöltése – böngészőben tölthető ki.
        </Text>
      </View>
    );
  }

  const empty = field.required && showError && !value.trim();
  return (
    <Field
      label={label}
      value={value}
      onChangeText={onChange}
      multiline={field.type === "TEXTAREA"}
      error={empty ? "Ez a mező kötelező." : null}
      maxLength={field.type === "TEXTAREA" ? 2000 : 300}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered:  { flex: 1, backgroundColor: colors.background, justifyContent: "center" },

  animal:     { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  animalImg:  { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  placeholder:{ backgroundColor: colors.primarySoft },
  animalText: { flex: 1 },
  animalName: { fontSize: 17, fontWeight: "700", color: colors.text },
  formTitle:  { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  description:{ fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg },

  fileField: {
    borderWidth: 1, borderColor: colors.border, borderStyle: "dashed",
    borderRadius: radius.md, padding: spacing.md, marginBottom: 14,
    backgroundColor: colors.surface,
  },
  fileLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  fileHint:  { fontSize: 12, color: colors.textMuted, marginTop: 4 },

  notice: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.lg, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  noticeTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  noticeText:  { fontSize: 13, color: colors.textMuted, lineHeight: 19 },

  summaryError: { color: colors.dangerDark, fontSize: 13, marginBottom: spacing.sm },
  submit:       { marginTop: spacing.sm },
  hint:         { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
});
