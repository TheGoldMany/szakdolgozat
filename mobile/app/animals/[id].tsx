import { useEffect, useState } from "react";
import {
  ActivityIndicator, Image, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getAnimal, submitApplication, type AnimalDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const GENDER: Record<string, string> = { MALE: "Kan", FEMALE: "Szuka" };
const TYPE:   Record<string, string> = { DOG: "Kutya", CAT: "Macska", OTHER: "Egyéb" };
const STATUS: Record<string, string> = {
  AVAILABLE: "Örökbefogadható", ADOPTED: "Örökbefogadva", RESERVED: "Foglalt",
};

export default function AnimalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();
  const [animal, setAnimal]   = useState<AnimalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getAnimal(id)
      .then(setAnimal)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApply() {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!animal) return;
    setApplying(true);
    try {
      await submitApplication({
        animalId:    animal.id,
        homeType:    "HOUSE",
        hasGarden:   false,
        hasChildren: false,
        hasPets:     false,
        motivation:  "Mobil alkalmazáson keresztül benyújtott kérelem.",
      });
      Alert.alert("Siker!", "Az örökbefogadási kérelmét rögzítettük.");
    } catch {
      Alert.alert("Hiba", "Nem sikerült a kérelem beküldése. Próbáld meg a weboldalon.");
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!animal) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Az állat nem található.</Text>
      </View>
    );
  }

  const primaryImage = animal.images.find(i => i.isPrimary) ?? animal.images[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {primaryImage ? (
        <Image source={{ uri: primaryImage.url }} style={styles.hero} resizeMode="cover" />
      ) : (
        <View style={[styles.hero, styles.placeholder]} />
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{animal.name}</Text>
          <View style={[
            styles.statusBadge,
            animal.status === "AVAILABLE" ? styles.statusGreen : styles.statusGray,
          ]}>
            <Text style={styles.statusText}>{STATUS[animal.status] ?? animal.status}</Text>
          </View>
        </View>

        {/* Fő adatok */}
        <View style={styles.chips}>
          {[
            TYPE[animal.type],
            animal.breed,
            GENDER[animal.gender],
            animal.age ? `${animal.age} hónapos` : null,
            animal.size,
          ].filter(Boolean).map((label, i) => (
            <View key={i} style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Jellemzők */}
        <View style={styles.traitsRow}>
          {[
            { label: "Oltott",     val: animal.vaccinated },
            { label: "Ivartalanított", val: animal.neutered },
            { label: "Chipes",     val: animal.chipped },
          ].map(t => (
            <View key={t.label} style={styles.trait}>
              <Text style={styles.traitIcon}>{t.val ? "✓" : "✗"}</Text>
              <Text style={[styles.traitLabel, { color: t.val ? "#16A34A" : "#9CA3AF" }]}>
                {t.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Menhely */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menhely</Text>
          <Text style={styles.sectionText}>{animal.shelter.name} · {animal.shelter.city}</Text>
        </View>

        {/* Leírás */}
        {animal.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bemutatkozás</Text>
            <Text style={styles.sectionText}>{animal.description}</Text>
          </View>
        )}

        {/* CTA */}
        {animal.status === "AVAILABLE" && (
          <TouchableOpacity
            style={[styles.applyBtn, applying && styles.applyBtnDisabled]}
            onPress={handleApply}
            disabled={applying}
          >
            <Text style={styles.applyBtnText}>
              {applying ? "Küldés…" : "Örökbefogadási kérelem"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#fff" },
  content:    { paddingBottom: 40 },
  centered:   { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText:  { color: "#6B7280", fontSize: 15 },
  hero:       { width: "100%", height: 280, backgroundColor: "#dbeafe" },
  placeholder:{ backgroundColor: "#dbeafe" },
  body:       { padding: 16 },
  titleRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  name:       { fontSize: 24, fontWeight: "800", color: "#111827", flex: 1 },
  statusBadge:{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusGreen:{ backgroundColor: "#D1FAE5" },
  statusGray: { backgroundColor: "#F3F4F6" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  chips:      { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  infoBadge:  { backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  infoBadgeText: { fontSize: 13, color: "#1D4ED8" },
  traitsRow:  { flexDirection: "row", gap: 20, marginBottom: 20 },
  trait:      { alignItems: "center" },
  traitIcon:  { fontSize: 18 },
  traitLabel: { fontSize: 11, marginTop: 2 },
  section:    { marginBottom: 16 },
  sectionTitle:{ fontSize: 13, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  sectionText: { fontSize: 15, color: "#374151", lineHeight: 22 },
  applyBtn:   { backgroundColor: "#2563EB", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  applyBtnDisabled: { opacity: 0.6 },
  applyBtnText:{ color: "#fff", fontSize: 16, fontWeight: "700" },
});
