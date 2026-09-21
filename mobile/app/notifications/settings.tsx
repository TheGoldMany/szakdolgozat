import { useCallback, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ApiError, getProfile, updateProfile, type NotificationPrefs } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { ErrorState, Loading } from "@/components/ui/ScreenState";
import { colors, radius, spacing } from "@/components/ui/theme";

/**
 * Push értesítések beállítása.
 *
 * HÁROM KAPCSOLÓ, NEM ÖTVENEGY: ennyi értesítéstípus van, de a felhasználó nem
 * típusokban gondolkodik, hanem abban, MIRŐL akar tudni. A típus → kategória
 * leképezés a szerveren (`lib/push.ts`) van, itt csak a három csoport látszik.
 *
 * Az értesítés a kikapcsolt kategóriában is LÉTREJÖN, csak nem szól: az
 * Értesítések képernyőn ugyanúgy megtalálja. A push a figyelemfelhívás, nem
 * maga az értesítés — ezt a magyarázószöveg is kimondja, különben a
 * felhasználó azt hinné, hogy lemarad dolgokról.
 */

interface Toggle {
  key:   keyof NotificationPrefs;
  label: string;
  hint:  string;
}

const TOGGLES: Toggle[] = [
  {
    key:   "pushMessages",
    label: "Üzenetek és válaszok",
    hint:  "Ha a menhely vagy egy gazdi ír neked.",
  },
  {
    key:   "pushCaseUpdates",
    label: "Ügyintézés",
    hint:  "Örökbefogadási kérelem, időpontfoglalás, utánkövetés, bejelentés.",
  },
  {
    key:   "pushCommunity",
    label: "Közösség",
    hint:  "Ismerősjelölés és a napi képed kedvelése.",
  },
];

export default function NotificationSettingsScreen() {
  const { data, error, loading, reload } = useApi(useCallback(() => getProfile(), []), []);

  /** Helyi felülírások – a kapcsoló azonnal váltson, ne a szerver válaszára várjon. */
  const [local, setLocal] = useState<Partial<NotificationPrefs>>({});
  const [saving, setSaving] = useState<keyof NotificationPrefs | null>(null);

  function valueOf(key: keyof NotificationPrefs): boolean {
    return local[key] ?? data?.user[key] ?? true;
  }

  async function toggle(key: keyof NotificationPrefs) {
    const next = !valueOf(key);
    setLocal((prev) => ({ ...prev, [key]: next }));
    setSaving(key);
    try {
      await updateProfile({ [key]: next });
    } catch (err) {
      // A szerver a hiteles forrás: sikertelen mentés után visszaáll a kapcsoló,
      // különben a felhasználó azt hinné, hogy elmentettük.
      setLocal((prev) => ({ ...prev, [key]: !next }));
      Alert.alert(
        "Nem sikerült menteni",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setSaving(null);
    }
  }

  if (loading && !data) return <Loading label="Beállítások betöltése…" />;
  if (error && !data)   return <ErrorState error={error} onRetry={reload} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Az értesítések az Értesítések listában akkor is megjelennek, ha itt
        kikapcsolod őket — csak nem szól miattuk a telefonod.
      </Text>

      <View style={styles.card}>
        {TOGGLES.map((item, index) => (
          <View
            key={item.key}
            style={[styles.row, index < TOGGLES.length - 1 && styles.rowDivider]}
          >
            <View style={styles.rowText}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.hint}>{item.hint}</Text>
            </View>
            <Switch
              value={valueOf(item.key)}
              onValueChange={() => toggle(item.key)}
              disabled={saving !== null}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        ))}
      </View>

      {/* A rendszerszintű tiltásról szólni kell: hiába van itt minden
          bekapcsolva, ha az appnak nincs értesítési engedélye, semmi nem jön. */}
      <Text style={styles.footnote}>
        Ha egyáltalán nem érkezik értesítés, nézd meg a telefon beállításaiban is,
        hogy engedélyezve van-e az appnak.
      </Text>
      <Text
        style={styles.systemLink}
        onPress={() => { void Linking.openSettings(); }}
        accessibilityRole="link"
      >
        Rendszerbeállítások megnyitása
      </Text>

      {Platform.OS === "ios" && (
        <Text style={styles.footnote}>
          iOS-en a push értesítés még nem érhető el; a beállítás a bekapcsolása
          után lép érvénybe.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg },
  intro:     { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 19 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText:    { flex: 1 },
  label:      { fontSize: 15, fontWeight: "600", color: colors.text },
  hint:       { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },

  footnote:   { fontSize: 12, color: colors.textFaint, marginTop: spacing.lg, lineHeight: 17 },
  systemLink: { fontSize: 13, color: colors.primary, fontWeight: "600", marginTop: spacing.sm },
});
