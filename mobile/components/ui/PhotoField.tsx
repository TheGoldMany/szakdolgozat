import { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ApiError } from "@/lib/api";
import { pickAndUpload, type PhotoSource } from "@/lib/photo";
import { colors, radius, spacing } from "./theme";

interface Props {
  label:    string;
  /** A feltöltött képek címei. Több kép is engedhető (pl. bejelentésnél 6). */
  urls:     string[];
  onChange: (urls: string[]) => void;
  max?:     number;
  hint?:    string;
  endpoint?: "/api/upload" | "/api/upload/attachment";
}

/**
 * Fotó hozzáadása kamerával vagy a galériából.
 *
 * KÉT GOMB, NEM EGY: a „Fotózás" és a „Galéria" külön szerepel, nem egy közös
 * választó mögött. Így ha valaki megtagadja a kamerahozzáférést, a galéria
 * gomb ugyanúgy ott van és működik — az app nem akad el, és nem kell
 * kitalálnia, hogyan jusson tovább.
 *
 * A feltöltés AZONNAL megtörténik, nem a beküldéskor: a helyszínen készült
 * kép így akkor is megmarad, ha az űrlap kitöltése közben valami félbeszakad,
 * és a beküldés gyors marad, nem kell a nagy fájlra várni.
 */
export function PhotoField({
  label, urls, onChange, max = 1, hint, endpoint,
}: Props) {
  const [busy, setBusy] = useState<PhotoSource | null>(null);
  const full = urls.length >= max;

  async function add(source: PhotoSource) {
    if (full || busy) return;
    setBusy(source);
    try {
      const url = await pickAndUpload(source, endpoint);
      // `null`: megszakítás vagy megtagadott engedély – a felhasználó már
      // kapott üzenetet, itt nincs mit mondani.
      if (url) onChange([...urls, url]);
    } catch (err) {
      Alert.alert(
        "Nem sikerült a feltöltés",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setBusy(null);
    }
  }

  function remove(url: string) {
    onChange(urls.filter((u) => u !== url));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {max > 1 && <Text style={styles.count}>  {urls.length}/{max}</Text>}
      </Text>

      {urls.length > 0 && (
        <View style={styles.thumbs}>
          {urls.map((url) => (
            <View key={url} style={styles.thumbWrap}>
              <Image source={{ uri: url }} style={styles.thumb} />
              <TouchableOpacity
                onPress={() => remove(url)}
                style={styles.removeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Kép eltávolítása"
              >
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!full && (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => add("camera")}
            disabled={!!busy}
            accessibilityRole="button"
          >
            {busy === "camera"
              ? <ActivityIndicator color={colors.primary} />
              : <Text style={styles.btnText}>Fotózás</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btn}
            onPress={() => add("library")}
            disabled={!!busy}
            accessibilityRole="button"
          >
            {busy === "library"
              ? <ActivityIndicator color={colors.primary} />
              : <Text style={styles.btnText}>Galéria</Text>}
          </TouchableOpacity>
        </View>
      )}

      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 8 },
  count: { fontWeight: "400", color: colors.textFaint },

  thumbs:    { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  thumbWrap: { position: "relative" },
  thumb:     { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  removeBtn: {
    position: "absolute", top: -6, right: -6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.dangerDark,
    alignItems: "center", justifyContent: "center",
  },
  removeText: { color: "#fff", fontSize: 16, lineHeight: 18, fontWeight: "700" },

  buttons: { flexDirection: "row", gap: spacing.sm },
  btn: {
    flex: 1, minHeight: 46, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  btnText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  hint:    { fontSize: 12, color: colors.textMuted, marginTop: 6 },
});
