import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import AnimalCard from "@/components/AnimalCard";
import { Button, ListState, colors, spacing } from "@/components/ui";
import { getFavoriteAnimals, type Animal } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import { FlatList, RefreshControl } from "react-native";

/**
 * Kedvencek.
 *
 * A lista a kedvencek AZONOSÍTÓIRA figyel, nem egy pillanatképre: ha a
 * felhasználó itt veszi ki a szívet, az elem azonnal eltűnik, és nem kell
 * megvárni egy újratöltést. Enélkül a kivett kedvenc ott maradna a listában,
 * és a szív állapota ellentmondana a lista tartalmának.
 */
export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { ids, reload: reloadIds } = useFavorites();

  const fetcher = useCallback(() => getFavoriteAnimals(), [user?.id]);
  const { data, error, loading, reload } = useApi<Animal[]>(fetcher, [user?.id]);

  // A szerverről kapott állatok közül csak azok maradnak, amik MÉG kedvencek.
  const animals = (data ?? []).filter((a) => ids.has(a.id));

  const refreshAll = useCallback(() => { reloadIds(); reload(); }, [reloadIds, reload]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <ListState
          loading={false} error={null} empty
          emptyTitle="Nincs bejelentkezve"
          emptyDescription="A kedvenceid megtekintéséhez jelentkezz be."
        />
        <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} fullWidth={false} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={animals}
      keyExtractor={(a) => a.id}
      renderItem={({ item }) => <AnimalCard animal={item} />}
      contentContainerStyle={[styles.content, animals.length === 0 && styles.emptyContent]}
      refreshControl={
        <RefreshControl refreshing={loading && animals.length > 0} onRefresh={refreshAll} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <ListState
          loading={loading}
          error={error}
          empty={!loading && !error}
          emptyTitle="Még nincs kedvenced"
          emptyDescription="Az állatok listájában a szív ikonnal jelölheted meg, akit szeretnél később visszakeresni."
          onRetry={refreshAll}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.lg },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  centered:     { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.md },
});
