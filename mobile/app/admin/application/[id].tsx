import { useCallback, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ApiError, decideApplication, getAdminApplication } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ErrorState, Loading } from "@/components/ui/ScreenState";
import { colors, radius, spacing } from "@/components/ui/theme";

/**
 * Örökbefogadási kérelem elbírálása — menhelyi adminnak.
 *
 * MIÉRT VAN EZ A TELEFONON: a kérelem értesítéssel érkezik, EGY döntés, és a
 * késlekedésnek ára van — a jelentkező közben másik állatot keres. Ez a három
 * együtt indokolja, hogy ne kelljen a gép elé ülni. A menhely többi
 * adminisztrációja (állatnyilvántartás, egészségügy, készlet, pénzügy) marad a
 * weben: azok hosszú űrlapok és széles táblázatok.
 *
 * A DÖNTÉS NEM VONHATÓ VISSZA egy újabb állítással: értesítést és e-mailt küld
 * a kérelmezőnek, jóváhagyásnál pedig utánkövetést ütemez. Ezért kér
 * megerősítést, és ezért van külön indoklás-mező az elutasításhoz.
 */

const STATUS_LABELS: Record<string, string> = {
  PENDING:   "Függőben",
  REVIEWING: "Elbírálás alatt",
  APPROVED:  "Elfogadva",
  REJECTED:  "Elutasítva",
  INVITED:   "Meghívva",
  WITHDRAWN: "Visszavonva",
};

const HOME_TYPE_LABELS: Record<string, string> = {
  HOUSE: "Ház", APARTMENT: "Lakás", OTHER: "Egyéb",
};

/** Igen / nem / nincs megadva – a három eset nem ugyanaz. */
function yesNo(value: boolean | null): string {
  if (value === null) return "Nincs megadva";
  return value ? "Igen" : "Nem";
}

export default function AdminApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useApi(
    useCallback(() => getAdminApplication(String(id)), [id]),
    [id],
  );
  const app = data?.application ?? null;

  const [notes, setNotes] = useState("");
  const [busy, setBusy]   = useState(false);

  async function decide(status: "REVIEWING" | "APPROVED" | "REJECTED") {
    setBusy(true);
    try {
      await decideApplication(String(id), status, notes.trim() || undefined);
      reload();
      // A visszalépés szándékos: az admin a listára tér vissza, ahol a
      // következő elintézendő tétel várja.
      router.back();
    } catch (err) {
      Alert.alert(
        "Nem sikerült a mentés",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmDecision(status: "APPROVED" | "REJECTED") {
    const approving = status === "APPROVED";
    Alert.alert(
      approving ? "Elfogadod a kérelmet?" : "Elutasítod a kérelmet?",
      approving
        ? "A kérelmező értesítést és e-mailt kap, és elindul az utánkövetés ütemezése. Ez nem vonható vissza."
        : "A kérelmező értesítést és e-mailt kap az indoklással. Ez nem vonható vissza.",
      [
        { text: "Mégsem", style: "cancel" },
        {
          text: approving ? "Elfogadom" : "Elutasítom",
          style: approving ? "default" : "destructive",
          onPress: () => decide(status),
        },
      ],
    );
  }

  if (loading && !app) return <Loading label="Kérelem betöltése…" />;
  if (error && !app)   return <ErrorState error={error} onRetry={reload} />;
  if (!app)            return <ErrorState error={new Error("A kérelem nem található.")} />;

  const decided = app.status === "APPROVED" || app.status === "REJECTED"
    || app.status === "WITHDRAWN";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.animal}>{app.animal.name}</Text>
      <Text style={styles.status}>{STATUS_LABELS[app.status] ?? app.status}</Text>

      <View style={styles.box}>
        <Text style={styles.boxTitle}>Kérelmező</Text>
        <Row label="Név" value={app.user?.name ?? "Névtelen"} />
        <Row label="E-mail" value={app.user?.email ?? "—"} />
        {!!app.user?.phone && <Row label="Telefon" value={app.user.phone} />}
        {!!app.user?.city && <Row label="Település" value={app.user.city} />}
      </View>

      {/* A kapcsolatfelvétel egy koppintás: a döntés előtt gyakran kérdezni
          kell valamit, és a telefonszám kimásolása a legrosszabb pillanatban
          szakítaná meg a folyamatot. */}
      <View style={styles.contact}>
        {!!app.user?.phone && (
          <Button
            title="Hívás"
            variant="outline"
            fullWidth={false}
            onPress={() => Linking.openURL(`tel:${app.user!.phone}`)}
            style={styles.contactBtn}
          />
        )}
        {!!app.user?.email && (
          <Button
            title="E-mail"
            variant="outline"
            fullWidth={false}
            onPress={() => Linking.openURL(`mailto:${app.user!.email}`)}
            style={styles.contactBtn}
          />
        )}
      </View>

      <View style={styles.box}>
        <Text style={styles.boxTitle}>Válaszok</Text>
        <Row label="Lakhatás" value={app.homeType ? (HOME_TYPE_LABELS[app.homeType] ?? app.homeType) : "Nincs megadva"} />
        <Row label="Kert" value={yesNo(app.hasGarden)} />
        <Row label="Gyermek" value={yesNo(app.hasChildren)} />
        <Row label="Háziállat" value={yesNo(app.hasPets)} />
        <Row label="Beadva" value={new Date(app.createdAt).toLocaleDateString("hu-HU")} />
      </View>

      {!!app.user?.bio && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Bemutatkozás</Text>
          <Text style={styles.paragraph}>{app.user.bio}</Text>
        </View>
      )}

      {!!app.experience && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Korábbi tapasztalat</Text>
          <Text style={styles.paragraph}>{app.experience}</Text>
        </View>
      )}

      {!!app.message && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Üzenet a menhelynek</Text>
          <Text style={styles.paragraph}>{app.message}</Text>
        </View>
      )}

      {decided ? (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>A döntés megszületett</Text>
          {!!app.reviewNotes && <Text style={styles.paragraph}>{app.reviewNotes}</Text>}
          <Text style={styles.hint}>
            A státusz módosítása a webes vezérlőpulton lehetséges.
          </Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <Field
            label="Megjegyzés (a kérelmező is látja)"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
            hint="Elutasításnál ez kerül az értesítésbe és az e-mailbe."
          />

          {app.status === "PENDING" && (
            <Button
              title="Elbírálás alá veszem"
              variant="outline"
              loading={busy}
              onPress={() => decide("REVIEWING")}
            />
          )}
          <Button title="Elfogadom" loading={busy} onPress={() => confirmDecision("APPROVED")} />
          <Button
            title="Elutasítom"
            variant="danger"
            loading={busy}
            onPress={() => confirmDecision("REJECTED")}
          />
        </View>
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

  animal: { fontSize: 22, fontWeight: "700", color: colors.text },
  status: { fontSize: 13, color: colors.primary, fontWeight: "600", marginTop: 2, marginBottom: spacing.lg },

  box:      { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  boxTitle: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm },
  paragraph: { fontSize: 14, lineHeight: 21, color: colors.text },
  hint:      { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },

  row:      { flexDirection: "row", gap: spacing.md, marginBottom: 4 },
  rowLabel: { width: 100, fontSize: 12, color: colors.textMuted },
  rowValue: { flex: 1, fontSize: 13, color: colors.text },

  contact:    { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  contactBtn: { flex: 1 },

  actions: { marginTop: spacing.lg, gap: spacing.sm },
});
