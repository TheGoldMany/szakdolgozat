import { useEffect, useState } from "react";
import {
  ActivityIndicator, Image, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { getMyApplications, type MyApplication } from "@/lib/api";

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

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMyApplications().then(setApps).finally(() => setLoading(false));
  }, [user]);

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

      {/* Kérelmek */}
      <Text style={styles.sectionTitle}>Kérelmeim</Text>
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

      {/* Kijelentkezés */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Kijelentkezés</Text>
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
});
