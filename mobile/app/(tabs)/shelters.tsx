import { useEffect, useState } from "react";
import {
  ActivityIndicator, FlatList, Linking, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { getShelters, type Shelter } from "@/lib/api";

function ShelterCard({ shelter }: { shelter: Shelter }) {
  function openMap() {
    const q = encodeURIComponent(`${shelter.name}, ${shelter.city}`);
    Linking.openURL(`https://maps.google.com/?q=${q}`);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{shelter.name}</Text>
        {shelter.isVerified && <Text style={styles.verified}>✓ Hitelesített</Text>}
      </View>
      <Text style={styles.cardCity}>{shelter.city}, {shelter.country}</Text>
      {shelter.phone && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${shelter.phone}`)}>
          <Text style={styles.link}>📞 {shelter.phone}</Text>
        </TouchableOpacity>
      )}
      {shelter.email && (
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${shelter.email}`)}>
          <Text style={styles.link}>✉️ {shelter.email}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
        <Text style={styles.mapBtnText}>Megnyitás térképen</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SheltersScreen() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getShelters().finally(() => setLoading(false)).then(setShelters).catch(() => {});
  }, []);

  if (loading) return <ActivityIndicator style={styles.spinner} size="large" color="#2563EB" />;

  return (
    <FlatList
      data={shelters}
      keyExtractor={s => s.id}
      renderItem={({ item }) => <ShelterCard shelter={item} />}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>Nincs menhely.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 60 },
  list:    { padding: 12 },
  empty:   { textAlign: "center", color: "#9CA3AF", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  cardName:    { fontSize: 16, fontWeight: "700", color: "#111827", flex: 1 },
  verified:    { fontSize: 11, color: "#16A34A", fontWeight: "600" },
  cardCity:    { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  link:        { fontSize: 13, color: "#2563EB", marginBottom: 4 },
  mapBtn:      { marginTop: 8, backgroundColor: "#EFF6FF", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  mapBtnText:  { color: "#2563EB", fontWeight: "600", fontSize: 13 },
});
