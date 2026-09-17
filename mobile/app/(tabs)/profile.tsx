import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, Image, Linking, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import {
  ApiError, deleteAccount, getMyApplications, PRIVACY_URL, TERMS_URL,
  type MyApplication,
} from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  PENDING:   "Függőben",
  REVIEWING: "Elbírálás alatt",
  APPROVED:  "Elfogadva",
  REJECTED:  "Elutasítva",
  INVITED:   "Meghívva",
  WITHDRAWN: "Visszavonva",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "#FEF3C7", REVIEWING: "#DBEAFE", APPROVED: "#D1FAE5",
  REJECTED: "#FEE2E2", INVITED: "#E0E7FF", WITHDRAWN: "#F3F4F6",
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [apps, setApps]   = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMyApplications()
      .then(setApps)
      // Az üres lista és a hiba nem ugyanaz: ha nem sikerült betölteni, azt
      // meg kell mondani, nem úgy mutatni, mintha nem lenne kérelme.
      .catch((err) => Alert.alert(
        "Nem sikerült betölteni",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      ))
      .finally(() => setLoading(false));
  }, [user]);

  /**
   * Fiók törlése.
   *
   * Az Apple minden olyan appnál megköveteli, ahol fiókot lehet létrehozni.
   * Két lépés: figyelmeztetés, majd külön megerősítés — a művelet
   * visszafordíthatatlan, a szerver azonnal anonimizálja az adatokat és
   * lemondja az aktív előfizetéseket.
   */
  function confirmDelete() {
    Alert.alert(
      "Fiók törlése",
      "Ez visszafordíthatatlan. Töröljük a személyes adataidat, és lemondjuk az "
      + "aktív támogatásaidat. Az örökbefogadási előzményed névtelenítve marad meg.",
      [
        { text: "Mégsem", style: "cancel" },
        {
          text: "Törlés", style: "destructive",
          onPress: () => Alert.alert(
            "Biztosan törlöd?",
            "Utána nem tudod visszaállítani a fiókot.",
            [
              { text: "Mégsem", style: "cancel" },
              { text: "Igen, töröljük", style: "destructive", onPress: runDelete },
            ],
          ),
        },
      ],
    );
  }

  async function runDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      // A szerver a munkameneteket is érvényteleníti, tehát a tárolt tokent is
      // el kell dobni, különben az app félig bejelentkezett állapotban maradna.
      await logout();
      Alert.alert("A fiók törölve", "Köszönjük, hogy velünk voltál.");
      router.replace("/");
    } catch (err) {
      Alert.alert(
        "Nem sikerült a törlés",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Nincs bejelentkezve</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push("/auth/login")}>
          <Text style={styles.btnText}>Bejelentkezés</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline} onPress={() => router.push("/auth/register")}>
          <Text style={styles.btnOutlineText}>Regisztráció</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Felhasználó fejléc */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name[0]?.toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      </View>

      {/* Gyorslinkek – a tabsáv négy helye tele van, ezek innen érhetők el. */}
      <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/favorites")}>
        <Text style={styles.linkText}>Kedvenceim</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/messages")}>
        <Text style={styles.linkText}>Üzenetek</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={() => router.push("/applications")}>
        <Text style={styles.linkText}>Kérelmeim</Text>
      </TouchableOpacity>

      {/* Kérelmek */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Kérelmeim</Text>
      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 20 }} />
      ) : apps.length === 0 ? (
        <Text style={styles.empty}>Még nincs örökbefogadási kérelmed.</Text>
      ) : (
        apps.map(app => {
          const img = app.animal.images.find(i => i.isPrimary) ?? app.animal.images[0];
          return (
            <TouchableOpacity
              key={app.id}
              style={styles.appCard}
              onPress={() => router.push(`/animals/${app.animal.id}`)}
            >
              {img ? (
                <Image source={{ uri: img.url }} style={styles.appImg} resizeMode="cover" />
              ) : (
                <View style={[styles.appImg, { backgroundColor: "#DBEAFE" }]} />
              )}
              <View style={styles.appInfo}>
                <Text style={styles.appName}>{app.animal.name}</Text>
                <Text style={styles.appDate}>
                  {new Date(app.createdAt).toLocaleDateString("hu-HU")}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[app.status] ?? "#F3F4F6" }]}>
                <Text style={styles.statusText}>{STATUS_LABEL[app.status] ?? app.status}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Jogi tájékoztatók – mindkét store elvárja, hogy az appból elérhetők
          legyenek, ne csak a weben lapuljanak. */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Jogi tájékoztatók</Text>
      <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(PRIVACY_URL)}>
        <Text style={styles.linkText}>Adatkezelési tájékoztató</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(TERMS_URL)}>
        <Text style={styles.linkText}>Általános szerződési feltételek</Text>
      </TouchableOpacity>

      {/* Kijelentkezés */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Kijelentkezés</Text>
      </TouchableOpacity>

      {/* Fiók törlése – szándékosan a lap alján, tompított megjelenéssel:
          kell hogy elérhető legyen, de nem szabad véletlenül rábökni. */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={confirmDelete}
        disabled={deleting}
      >
        {deleting
          ? <ActivityIndicator color="#B91C1C" />
          : <Text style={styles.deleteText}>Fiók törlése</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content:   { padding: 16, paddingBottom: 40 },
  centered:  { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title:     { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 20 },
  btn: {
    backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 14,
    paddingHorizontal: 40, marginBottom: 12, width: "100%", alignItems: "center",
  },
  btnText:       { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnOutline: {
    borderWidth: 1, borderColor: "#2563EB", borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 40, width: "100%", alignItems: "center",
  },
  btnOutlineText: { color: "#2563EB", fontWeight: "700", fontSize: 15 },
  header: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 20, gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#2563EB" },
  userName:   { fontSize: 17, fontWeight: "700", color: "#111827" },
  userEmail:  { fontSize: 13, color: "#6B7280" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  empty:    { color: "#9CA3AF", fontSize: 14, textAlign: "center", marginTop: 20 },
  appCard:  { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, padding: 10, marginBottom: 10, gap: 10 },
  appImg:   { width: 52, height: 52, borderRadius: 8 },
  appInfo:  { flex: 1 },
  appName:  { fontSize: 15, fontWeight: "600", color: "#111827" },
  appDate:  { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontWeight: "600", color: "#374151" },
  logoutBtn: { marginTop: 30, borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  logoutText: { color: "#EF4444", fontWeight: "600", fontSize: 15 },
  linkRow:  { backgroundColor: "#fff", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 8 },
  linkText: { color: "#2563EB", fontSize: 15, fontWeight: "500" },
  deleteBtn:  { marginTop: 14, paddingVertical: 14, alignItems: "center" },
  deleteText: { color: "#B91C1C", fontSize: 14, textDecorationLine: "underline" },
});
