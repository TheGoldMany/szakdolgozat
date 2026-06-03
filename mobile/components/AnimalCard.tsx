import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import type { Animal } from "@/lib/api";

const GENDER_LABEL: Record<string, string> = { MALE: "Kan", FEMALE: "Szuka" };
const TYPE_LABEL: Record<string, string> = { DOG: "Kutya", CAT: "Macska", OTHER: "Egyéb" };

export default function AnimalCard({ animal }: { animal: Animal }) {
  const router = useRouter();
  const image = animal.images.find(i => i.isPrimary) ?? animal.images[0];

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/animals/${animal.id}`)}>
      {image ? (
        <Image source={{ uri: image.url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{animal.name}</Text>
        <Text style={styles.meta}>
          {TYPE_LABEL[animal.type] ?? animal.type}
          {animal.breed ? ` · ${animal.breed}` : ""}
        </Text>
        <Text style={styles.sub}>
          {GENDER_LABEL[animal.gender] ?? animal.gender}
          {animal.age ? ` · ${animal.age} hó` : ""}
          {" · "}{animal.shelter.city}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  image: {
    width: "100%",
    height: 180,
    backgroundColor: "#E6F4FE",
  },
  placeholder: { backgroundColor: "#dbeafe" },
  info: { padding: 12 },
  name: { fontSize: 16, fontWeight: "700", color: "#111827" },
  meta: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  sub:  { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
});
