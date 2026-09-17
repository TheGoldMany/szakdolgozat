import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import type { Animal } from "@/lib/api";
import { useFavorites } from "@/lib/favorites";

const GENDER_LABEL: Record<string, string> = { MALE: "Kan", FEMALE: "Szuka" };
const TYPE_LABEL: Record<string, string> = { DOG: "Kutya", CAT: "Macska", OTHER: "Egyéb" };

export default function AnimalCard({ animal }: { animal: Animal }) {
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const image = animal.images.find(i => i.isPrimary) ?? animal.images[0];
  const favorite = isFavorite(animal.id);

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/animals/${animal.id}`)}>
      {image ? (
        <Image source={{ uri: image.url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}

      {/* A szív a képen ül, de KÜLÖN érinthető felület: a kártya megnyitása és
          a kedvencelés két különböző szándék, és a szív kicsi — ezért kap
          megnövelt találati területet, hogy ne a kártya nyíljon meg helyette. */}
      <TouchableOpacity
        style={styles.heart}
        onPress={() => toggle(animal.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={favorite ? "Eltávolítás a kedvencekből" : "Hozzáadás a kedvencekhez"}
        accessibilityState={{ selected: favorite }}
      >
        <Text style={[styles.heartIcon, favorite && styles.heartOn]}>
          {favorite ? "♥" : "♡"}
        </Text>
      </TouchableOpacity>
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
  heart: {
    position: "absolute", top: 8, right: 8,
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    // Félig átlátszó alap: a szív világos és sötét képen is olvasható marad.
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  heartIcon: { fontSize: 20, lineHeight: 24, color: "#6B7280" },
  heartOn:   { color: "#EF4444" },
  info: { padding: 12 },
  name: { fontSize: 16, fontWeight: "700", color: "#111827" },
  meta: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  sub:  { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
});
