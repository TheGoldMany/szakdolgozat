import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator, FlatList, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { getAnimals, type Animal } from "@/lib/api";
import AnimalCard from "@/components/AnimalCard";

const TYPES = [
  { label: "Mind", value: "" },
  { label: "Kutya", value: "DOG" },
  { label: "Macska", value: "CAT" },
  { label: "Egyéb", value: "OTHER" },
];

export default function AnimalsScreen() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage]   = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType]   = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async (nextPage = 1, append = false) => {
    try {
      const res = await getAnimals({ page: nextPage, type: type || undefined, q: search || undefined });
      setAnimals(prev => append ? [...prev, ...res.animals] : res.animals);
      setTotalPages(res.pagination.totalPages);
      setPage(nextPage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type, search]);

  useEffect(() => {
    setLoading(true);
    load(1);
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load(1);
  }

  function onEndReached() {
    if (page < totalPages && !loading) load(page + 1, true);
  }

  return (
    <View style={styles.container}>
      {/* Keresőmező */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Keresés név, fajta szerint…"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setSearch(query)}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(""); setSearch(""); }}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Típusszűrők */}
      <View style={styles.filters}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, type === t.value && styles.chipActive]}
            onPress={() => setType(t.value)}
          >
            <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && page === 1 ? (
        <ActivityIndicator style={styles.spinner} size="large" color="#2563EB" />
      ) : (
        <FlatList
          data={animals}
          keyExtractor={a => a.id}
          renderItem={({ item }) => <AnimalCard animal={item} />}
          contentContainerStyle={styles.list}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={styles.empty}>Nincs találat.</Text>
          }
          ListFooterComponent={
            loading && page > 1 ? <ActivityIndicator color="#2563EB" /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  input:  { flex: 1, height: 42, fontSize: 14, color: "#111827" },
  clear:  { padding: 8, color: "#9CA3AF", fontSize: 16 },
  filters: { flexDirection: "row", paddingHorizontal: 12, marginBottom: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  chipText:   { fontSize: 13, color: "#374151" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  list:    { paddingHorizontal: 12, paddingBottom: 24 },
  spinner: { marginTop: 60 },
  empty:   { textAlign: "center", color: "#9CA3AF", marginTop: 40, fontSize: 15 },
});
