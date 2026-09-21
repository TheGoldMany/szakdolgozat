import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Field, PhotoField, colors, spacing } from "@/components/ui";
import { ApiError, createDailyPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * Napi kép feltöltése.
 *
 * MIÉRT MOBILON A HELYE: a menhelyi admin az állatok között van, telefonnal a
 * kezében. A weben ehhez a gépe elé kellene ülnie, és átvinnie a képet — mire
 * odaér, a pillanat elmúlt. Ez a képernyő ezért egyetlen dologra való: egy
 * fotó és néhány szó.
 *
 * A kép 24 óra után kiesik a folyamból, de nem törlődik: a profilon naptárban
 * visszanézhető. Ezt ki is írjuk, mert enélkül a „eltűnik" véglegesnek
 * hangzana, és kevesebben posztolnának.
 */
export default function NewDailyPostScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [images, setImages]   = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (images.length === 0) {
      Alert.alert("Nincs kép", "Előbb készíts vagy válassz egy képet.");
      return;
    }
    setSending(true);
    try {
      await createDailyPost({
        imageUrl: images[0],
        caption:  caption.trim() || null,
      });
      Alert.alert("Feltöltve", "A képed 24 órán át látszik a folyamban.");
      router.back();
    } catch (err) {
      Alert.alert(
        "Nem sikerült a feltöltés",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setSending(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.needLogin}>A napi képhez be kell jelentkezned.</Text>
        <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} fullWidth={false} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Egy kép a mai napról – a tiedről, a menhelyiről, vagy amit az utcán láttál.
        </Text>

        <PhotoField
          label="Mai kép"
          urls={images}
          onChange={setImages}
          max={1}
          hint="A folyamban 24 órán át látszik, utána a profilodon naptárban nézheted vissza."
        />

        <Field
          label="Mit látunk a képen?"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={500}
          placeholder="Pár szó, ha van kedved…"
          hint="Nem kötelező."
        />

        <Button
          title="Feltöltés"
          onPress={submit}
          loading={sending}
          disabled={images.length === 0}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },
  lead:      { fontSize: 15, color: colors.textMuted, lineHeight: 21, marginBottom: spacing.lg },
  centered:  { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.lg },
  needLogin: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
});
