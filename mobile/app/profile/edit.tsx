import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ApiError, changePassword, getProfile, HOME_TYPES, updateAvatar, updateProfile,
  type HomeType, type Profile,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { pickAndUpload, type PhotoSource } from "@/lib/photo";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ErrorState, Loading } from "@/components/ui/ScreenState";
import { colors, radius, spacing } from "@/components/ui/theme";

/**
 * Profil szerkesztése.
 *
 * HÁROM, EGYMÁSTÓL FÜGGETLEN MENTÉS van, nem egy nagy „Mentés" gomb:
 *   • az adatok (`PATCH /api/profile`),
 *   • a profilkép (`PATCH /api/profile/avatar` — a képet előbb a tárolóba
 *     töltjük, és csak a kész címet kötjük a profilhoz),
 *   • a jelszó (`POST /api/auth/change-password`, jelenlegi jelszóval).
 * Külön végpontok, külön hibák; egy közös gomb elrejtené, melyik ment el és
 * melyik nem.
 *
 * Az ÖRÖKBEFOGADÓI BEMUTATKOZÁS azért van itt és nem a kérelmen: az EMBERRE
 * vonatkozik, nem egy konkrét állatra — egyszer kell megírni, és minden
 * kérelembe automatikusan bekerül.
 */

const HOME_TYPE_LABELS: Record<HomeType, string> = {
  HOUSE:     "Ház",
  APARTMENT: "Lakás",
  OTHER:     "Egyéb",
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi(useCallback(() => getProfile(), []), []);
  const profile = data?.user ?? null;

  return loading && !profile
    ? <Loading label="Profil betöltése…" />
    : error && !profile
      ? <ErrorState error={error} onRetry={reload} />
      : profile
        ? <EditForm profile={profile} onSaved={reload} onDone={() => router.back()} />
        : <ErrorState error={new Error("A profil nem tölthető be.")} onRetry={reload} />;
}

/**
 * Külön komponens, hogy a mezők kezdőértéke a BETÖLTÖTT profilból jöjjön.
 *
 * Ha a szülőben lennének, az első rendereléskor üresen jönnének létre, és a
 * betöltés utáni feltöltéshez egy effekt kellene — az pedig felülírná, amit a
 * felhasználó időközben gépelt.
 */
function EditForm({
  profile, onSaved, onDone,
}: { profile: Profile; onSaved: () => void; onDone: () => void }) {
  const [name, setName]       = useState(profile.name ?? "");
  const [phone, setPhone]     = useState(profile.phone ?? "");
  const [city, setCity]       = useState(profile.city ?? "");
  const [address, setAddress] = useState(profile.address ?? "");

  const [bio, setBio]                 = useState(profile.bio ?? "");
  const [homeType, setHomeType]       = useState<HomeType | null>((profile.homeType as HomeType) ?? null);
  const [hasGarden, setHasGarden]     = useState(profile.hasGarden ?? false);
  const [hasChildren, setHasChildren] = useState(profile.hasChildren ?? false);
  const [hasPets, setHasPets]         = useState(profile.hasPets ?? false);
  const [experience, setExperience]   = useState(profile.adoptionExperience ?? "");

  const [image, setImage] = useState(profile.image);
  const [uploading, setUploading] = useState<PhotoSource | null>(null);
  const [saving, setSaving]       = useState(false);

  // Jelszóváltás
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [pwBusy, setPwBusy]       = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  useEffect(() => { setNameError(null); }, [name]);

  async function save() {
    // A szerver 2 karakternél rövidebb nevet nem fogad el; itt is megfogjuk,
    // hogy a hiba a mező mellett jelenjen meg, ne egy párbeszédablakban.
    if (name.trim().length < 2) {
      setNameError("Legalább 2 karakter szükséges.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name:    name.trim(),
        // Az üres mező TÖRLÉST jelent, nem „nem változott": a végpont
        // elfogadja a `null`-t, és a séma is nullázhatónak írja ezeket.
        phone:   phone.trim()   || null,
        city:    city.trim()    || null,
        address: address.trim() || null,
        bio:     bio.trim()     || null,
        homeType,
        hasGarden,
        hasChildren,
        hasPets,
        adoptionExperience: experience.trim() || null,
      });
      Alert.alert("Mentve", "A profilod frissült.");
      onSaved();
      onDone();
    } catch (err) {
      Alert.alert(
        "Nem sikerült a mentés",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeAvatar(source: PhotoSource) {
    setUploading(source);
    try {
      const url = await pickAndUpload(source);
      // `null`: megszakítás vagy megtagadott engedély – a felhasználó már
      // kapott üzenetet, itt nincs mit mondani.
      if (!url) return;
      await updateAvatar(url);
      setImage(url);
      onSaved();
    } catch (err) {
      Alert.alert(
        "Nem sikerült a profilkép mentése",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setUploading(null);
    }
  }

  async function savePassword() {
    if (newPw.length < 8) {
      Alert.alert("Túl rövid jelszó", "Az új jelszó legalább 8 karakter legyen.");
      return;
    }
    setPwBusy(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      Alert.alert("Jelszó megváltoztatva", "A következő belépésnél már az újat használd.");
    } catch (err) {
      Alert.alert(
        "Nem sikerült a jelszóváltás",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Profilkép ─────────────────────────────────── */}
      <View style={styles.avatarBlock}>
        {image
          ? <Image source={{ uri: image }} style={styles.avatar} />
          : <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>
                {(name.trim()[0] ?? profile.email[0]).toUpperCase()}
              </Text>
            </View>}
        <View style={styles.avatarButtons}>
          <Button
            title="Fotózás"
            variant="outline"
            fullWidth={false}
            loading={uploading === "camera"}
            onPress={() => changeAvatar("camera")}
            style={styles.avatarButton}
          />
          <Button
            title="Galéria"
            variant="outline"
            fullWidth={false}
            loading={uploading === "library"}
            onPress={() => changeAvatar("library")}
            style={styles.avatarButton}
          />
        </View>
      </View>

      {/* ── Alapadatok ────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Alapadatok</Text>
      <Field label="Név" value={name} onChangeText={setName} error={nameError} maxLength={100} />
      <Field
        label="E-mail"
        value={profile.email}
        onChangeText={() => {}}
        editable={false}
        hint="Az e-mail cím a fiókazonosító, itt nem módosítható."
      />
      <Field label="Telefonszám" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} />
      <Field label="Város" value={city} onChangeText={setCity} maxLength={100} />
      <Field label="Cím" value={address} onChangeText={setAddress} maxLength={200} />

      {/* ── Örökbefogadói bemutatkozás ────────────────── */}
      <Text style={styles.sectionTitle}>Örökbefogadói bemutatkozás</Text>
      <Text style={styles.sectionHint}>
        Ezek a válaszok minden örökbefogadási kérelmedbe bekerülnek, így nem kell
        minden alkalommal újra kitöltened.
      </Text>

      <Field
        label="Rövid bemutatkozás"
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={2000}
        placeholder="Ki vagy, miért szeretnél örökbe fogadni?"
      />

      <Text style={styles.label}>Hol laksz?</Text>
      <View style={styles.chips}>
        {HOME_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setHomeType(homeType === t ? null : t)}
            style={[styles.chip, homeType === t && styles.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: homeType === t }}
          >
            <Text style={[styles.chipText, homeType === t && styles.chipTextOn]}>
              {HOME_TYPE_LABELS[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Toggle label="Van kertem" value={hasGarden} onChange={setHasGarden} />
      <Toggle label="Gyermek él a háztartásban" value={hasChildren} onChange={setHasChildren} />
      <Toggle label="Van már háziállatom" value={hasPets} onChange={setHasPets} />

      <Field
        label="Korábbi állattartási tapasztalat"
        value={experience}
        onChangeText={setExperience}
        multiline
        maxLength={2000}
      />

      <Button title="Mentés" loading={saving} onPress={save} />

      {/* ── Jelszó ────────────────────────────────────── */}
      {/* Social login-nal készült fióknak nincs jelszava, ott ennek az
          űrlapnak nincs értelme — a szerver is 400-zal utasítaná el. */}
      {profile.hasPassword && (
        <>
          <Text style={styles.sectionTitle}>Jelszó megváltoztatása</Text>
          <Field label="Jelenlegi jelszó" value={currentPw} onChangeText={setCurrentPw} secure />
          <Field
            label="Új jelszó"
            value={newPw}
            onChangeText={setNewPw}
            secure
            hint="Legalább 8 karakter."
          />
          <Button
            title="Jelszó mentése"
            variant="outline"
            loading={pwBusy}
            disabled={!currentPw || !newPw}
            onPress={savePassword}
          />
        </>
      )}
    </ScrollView>
  );
}

function Toggle({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },

  avatarBlock:   { alignItems: "center", marginBottom: spacing.xl, gap: spacing.md },
  avatar:        { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primarySoft },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText:    { fontSize: 36, fontWeight: "700", color: colors.primary },
  avatarButtons: { flexDirection: "row", gap: spacing.sm },
  avatarButton:  { minWidth: 110 },

  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5,
    marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 17 },
  label:       { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },

  chips: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: spacing.lg, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, minHeight: 36, justifyContent: "center",
  },
  chipOn:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:   { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  chipTextOn: { color: "#fff" },

  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: spacing.md, marginBottom: spacing.md, minHeight: 40,
  },
  toggleLabel: { flex: 1, fontSize: 14, color: colors.text },
});
