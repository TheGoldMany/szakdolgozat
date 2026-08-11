import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, Pressable,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { getShelterAdminOverview, type ShelterAdminOverview } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  PENDING:   "Függőben",
  REVIEWING: "Elbírálás alatt",
  CONFIRMED: "Megerősítve",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("hu-HU", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData]       = useState<ShelterAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getShelterAdminOverview());
    } catch {
      setError("Nem sikerült betölteni az adatokat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Jelentkezz be a folytatáshoz.</Text>
        <Pressable style={styles.button} onPress={() => router.push("/auth/login")}>
          <Text style={styles.buttonText}>Bejelentkezés</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{error ?? "Nincs adat."}</Text>
        <Pressable style={styles.button} onPress={load}>
          <Text style={styles.buttonText}>Újra</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <Text style={styles.shelterName}>{data.shelter.name}</Text>

      <View style={styles.statsRow}>
        <Stat value={data.counts.pendingApplications}  label="Kérelem" />
        <Stat value={data.counts.upcomingAppointments} label="Időpont" />
        <Stat value={data.counts.availableAnimals}     label="Elérhető" />
      </View>

      <Text style={styles.sectionTitle}>Feldolgozásra váró kérelmek</Text>
      {data.pendingApplications.length === 0 ? (
        <Text style={styles.empty}>Nincs feldolgozásra váró kérelem.</Text>
      ) : (
        data.pendingApplications.map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.cardTitle}>{a.animal.name}</Text>
            <Text style={styles.cardSub}>{a.user?.name ?? a.user?.email ?? "Ismeretlen"}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.badge}>{STATUS_LABEL[a.status] ?? a.status}</Text>
              <Text style={styles.date}>{formatDate(a.createdAt)}</Text>
            </View>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Közelgő időpontok</Text>
      {data.upcomingAppointments.length === 0 ? (
        <Text style={styles.empty}>Nincs közelgő időpont.</Text>
      ) : (
        data.upcomingAppointments.map((ap) => (
          <View key={ap.id} style={styles.card}>
            <Text style={styles.cardTitle}>{ap.animal?.name ?? "Általános látogatás"}</Text>
            <Text style={styles.cardSub}>{ap.user?.name ?? ap.user?.email ?? "Ismeretlen"}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.badge}>{STATUS_LABEL[ap.status] ?? ap.status}</Text>
              <Text style={styles.date}>{formatDate(ap.confirmedAt ?? ap.proposedAt)}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 32 },
  center:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#F9FAFB" },
  muted:   { color: "#6B7280", fontSize: 14 },
  button:  { backgroundColor: "#2563EB", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  buttonText: { color: "#fff", fontWeight: "600" },

  shelterName: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  stat: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#F3F4F6",
  },
  statValue: { fontSize: 22, fontWeight: "700", color: "#2563EB" },
  statLabel: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginTop: 8, marginBottom: 8 },
  empty: { fontSize: 13, color: "#9CA3AF", marginBottom: 12 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSub:   { fontSize: 12, color: "#6B7280", marginTop: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  badge: {
    fontSize: 11, fontWeight: "600", color: "#B45309",
    backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    overflow: "hidden",
  },
  date: { fontSize: 11, color: "#9CA3AF" },
});
