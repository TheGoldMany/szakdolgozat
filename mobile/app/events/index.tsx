import { useCallback } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getEvents, type EventItem } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { EVENT_TYPE_LABELS, formatEventDate, freeSpots, isRegistered } from "@/lib/events";
import { ListState } from "@/components/ui/ScreenState";
import { colors, radius, spacing } from "@/components/ui/theme";

/**
 * Közelgő események.
 *
 * Nincs lapozás, mert a végpont sem lapoz: egy menhelynek néhány eseménye van,
 * és a lista amúgy is csak a jövőbelieket mutatja. Ezért sima `FlatList` és
 * `useApi`, nem `usePagedList` — az utóbbi itt csak látszatbonyolultság lenne.
 */
export default function EventsScreen() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi(useCallback(() => getEvents(), []), []);
  const events = data?.events ?? [];

  return (
    <FlatList
      style={styles.container}
      data={events}
      keyExtractor={(e) => e.id}
      contentContainerStyle={[styles.content, events.length === 0 && styles.emptyContent]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={colors.primary} />}
      ListEmptyComponent={
        <ListState
          loading={loading}
          error={error}
          empty={!loading && !error}
          emptyTitle="Nincs közelgő esemény"
          emptyDescription="Ha a menhelyek programot hirdetnek, itt fog megjelenni."
          loadingLabel="Események betöltése…"
          onRetry={reload}
        />
      }
      renderItem={({ item }) => (
        <EventCard event={item} onPress={() => router.push(`/events/${item.id}`)} />
      )}
    />
  );
}

function EventCard({ event, onPress }: { event: EventItem; onPress: () => void }) {
  const free = freeSpots(event);
  const mine = isRegistered(event);

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      {!!event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.image} />}

      <View style={styles.body}>
        <View style={styles.badges}>
          <Text style={styles.typeBadge}>{EVENT_TYPE_LABELS[event.type] ?? event.type}</Text>
          {/* A saját jelentkezés jelzése nem CSAK szín: a szövege is kimondja,
              hogy a színt nem érzékelő felhasználó se maradjon le róla. */}
          {mine && <Text style={styles.mineBadge}>Jelentkeztél</Text>}
        </View>

        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.date}>{formatEventDate(event.startsAt)}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {event.shelter.name} · {event.location}
        </Text>

        {free !== null && (
          <Text style={free === 0 ? styles.full : styles.spots}>
            {free === 0 ? "Betelt" : `${free} szabad hely`}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.lg, gap: spacing.md },
  emptyContent: { flexGrow: 1, justifyContent: "center" },

  card:  { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
  image: { width: "100%", height: 140, backgroundColor: colors.primarySoft },
  body:  { padding: spacing.lg },

  badges:    { flexDirection: "row", gap: spacing.sm, marginBottom: 6, flexWrap: "wrap" },
  typeBadge: {
    fontSize: 11, fontWeight: "600", color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: "hidden",
  },
  mineBadge: {
    fontSize: 11, fontWeight: "600", color: "#065F46",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: "hidden",
  },

  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  date:  { fontSize: 13, color: colors.primary, fontWeight: "600", marginTop: 4 },
  meta:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  spots: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  full:  { fontSize: 12, color: colors.dangerDark, fontWeight: "600", marginTop: 6 },
});
