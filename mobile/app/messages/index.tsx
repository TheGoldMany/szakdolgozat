import { useCallback } from "react";
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, ListState, colors, radius, spacing } from "@/components/ui";
import { getConversations, type Conversation } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";

/**
 * Beszélgetések listája (docs/06-messages.md, US-06-B).
 *
 * A sorrendet a szerver adja (`updatedAt` szerint csökkenő), ezért itt nem
 * rendezünk újra: a legutóbbi üzenet dátuma nem feltétlenül ugyanaz, mint a
 * beszélgetés frissítési ideje, és a kettő szétcsúszhatna.
 */
export default function ConversationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const fetcher = useCallback(() => getConversations(), [user?.id]);
  const { data, error, loading, reload } = useApi<Conversation[]>(fetcher, [user?.id]);
  const items = data ?? [];

  if (!user) {
    return (
      <View style={styles.centered}>
        <ListState
          loading={false} error={null} empty
          emptyTitle="Nincs bejelentkezve"
          emptyDescription="Az üzeneteid megtekintéséhez jelentkezz be."
        />
        <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} fullWidth={false} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={[styles.content, items.length === 0 && styles.emptyContent]}
      refreshControl={
        <RefreshControl refreshing={loading && items.length > 0} onRefresh={reload} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <ListState
          loading={loading} error={error} empty={!loading && !error}
          emptyTitle="Még nincs üzeneted"
          emptyDescription="Egy állat adatlapjáról tudsz üzenetet írni a menhelynek."
          onRetry={reload}
        />
      }
      renderItem={({ item }) => {
        const image = item.animal?.images?.[0];
        const last  = item.messages?.[0];
        const unread = item.unreadCount > 0;

        return (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/messages/${item.id}`)}
          >
            {image
              ? <Image source={{ uri: image.url }} style={styles.img} />
              : <View style={[styles.img, styles.placeholder]} />}

            <View style={styles.info}>
              <Text style={[styles.title, unread && styles.bold]} numberOfLines={1}>
                {item.animal?.name ?? item.shelter?.name ?? "Beszélgetés"}
              </Text>
              <Text style={styles.shelter} numberOfLines={1}>{item.shelter?.name ?? ""}</Text>
              {/* Meghívó-üzenetnek nincs szövege, ezért külön jelezzük –
                  különben a sor üresnek látszana. */}
              <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
                {last?.inviteToken
                  ? "Kérvény meghívó érkezett"
                  : (last?.content ?? (last?.attachmentName ? `Csatolmány: ${last.attachmentName}` : "—"))}
              </Text>
            </View>

            {unread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount > 9 ? "9+" : item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: spacing.lg, gap: spacing.sm },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  centered:     { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.md },

  row:  { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  img:  { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  placeholder: { backgroundColor: colors.primarySoft },
  info: { flex: 1, minWidth: 0 },
  title:   { fontSize: 15, fontWeight: "600", color: colors.text },
  bold:    { fontWeight: "800" },
  shelter: { fontSize: 12, color: colors.textFaint, marginTop: 1 },
  preview: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  previewUnread: { color: colors.text, fontWeight: "600" },
  badge:     { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
