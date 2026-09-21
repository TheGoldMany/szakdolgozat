import { useCallback, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, ListState, colors, radius, spacing } from "@/components/ui";
import {
  ApiError, getNotifications, markAllNotificationsRead, markNotificationRead,
  type Notification, type NotificationList,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";
import { openNotification, resolveNotificationLink } from "@/lib/notification-link";

/**
 * Értesítéslista.
 *
 * A szerver sorrendjét tartjuk: előbb az olvasatlanok, azon belül a legújabb.
 * Így az számít elsőnek, amire a felhasználónak reagálnia kell, nem az, ami
 * véletlenül a legfrissebb.
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [marking, setMarking]       = useState(false);

  const fetcher = useCallback(
    () => getNotifications(onlyUnread ? { filter: "unread" } : {}),
    [user?.id, onlyUnread],
  );
  const { data, error, loading, reload } =
    useApi<NotificationList>(fetcher, [user?.id, onlyUnread]);

  const items  = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  /**
   * Megnyitás: előbb olvasottra állítjuk, aztán ugrunk.
   *
   * Az olvasottra állítást NEM várjuk meg: a navigáció azonnal induljon,
   * különben a koppintás után egy pillanatra semmi nem történik. Ha a jelölés
   * elhasal, az értesítés olvasatlan marad — ez a kisebbik baj.
   */
  async function open(n: Notification) {
    const target = resolveNotificationLink(n.href);

    if (!n.readAt) {
      markNotificationRead(n.id)
        .then(() => reload())
        .catch(() => { /* marad olvasatlannak */ });
    }

    if (target.kind === "none") return;
    await openNotification(target, (path) => router.push(path as never));
  }

  async function markAll() {
    setMarking(true);
    try {
      await markAllNotificationsRead();
      reload();
    } catch (err) {
      Alert.alert(
        "Nem sikerült",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setMarking(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <ListState
          loading={false} error={null} empty
          emptyTitle="Nincs bejelentkezve"
          emptyDescription="Az értesítéseid megtekintéséhez jelentkezz be."
        />
        <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} fullWidth={false} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          onPress={() => setOnlyUnread((v) => !v)}
          style={[styles.filter, onlyUnread && styles.filterOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: onlyUnread }}
        >
          <Text style={[styles.filterText, onlyUnread && styles.filterTextOn]}>
            {onlyUnread ? "Csak olvasatlan" : "Mind"}
            {unread > 0 ? `  ${unread}` : ""}
          </Text>
        </TouchableOpacity>

        {unread > 0 && (
          <Button
            title="Mind olvasott"
            variant="ghost"
            fullWidth={false}
            loading={marking}
            onPress={markAll}
          />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.content, items.length === 0 && styles.emptyContent]}
        refreshControl={
          <RefreshControl refreshing={loading && items.length > 0} onRefresh={reload} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <ListState
            loading={loading} error={error} empty={!loading && !error}
            emptyTitle={onlyUnread ? "Nincs olvasatlan értesítés" : "Még nincs értesítésed"}
            emptyDescription={onlyUnread ? undefined : "Itt jelennek meg a kérelmeid, időpontjaid és üzeneteid hírei."}
            onRetry={reload}
          />
        }
        renderItem={({ item }) => {
          const isUnread = !item.readAt;
          const target   = resolveNotificationLink(item.href);

          return (
            <TouchableOpacity
              style={[styles.row, isUnread && styles.rowUnread]}
              onPress={() => open(item)}
              // Link nélküli értesítés csak tájékoztat; ilyenkor a koppintás
              // egyetlen hatása az olvasottra állítás.
              accessibilityRole="button"
              accessibilityLabel={`${item.title}${isUnread ? ", olvasatlan" : ""}`}
            >
              {/* Az olvasatlanságot pötty ÉS vastag betű is jelzi: a színes
                  pötty egyedül színtévesztőknek nem elég jel. */}
              <View style={styles.dotColumn}>
                {isUnread && <View style={styles.dot} />}
              </View>

              <View style={styles.info}>
                <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={2}>
                  {item.title}
                </Text>
                {!!item.body && (
                  <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
                )}
                <Text style={styles.meta}>
                  {new Date(item.createdAt).toLocaleDateString("hu-HU", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                  {target.kind === "web" ? "  ·  böngészőben nyílik" : ""}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered:  { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.md },

  toolbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface,
  },
  filter: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
  },
  filterOn:     { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText:   { fontSize: 13, fontWeight: "600", color: colors.text },
  filterTextOn: { color: "#fff" },

  content:      { padding: spacing.lg, gap: spacing.sm },
  emptyContent: { flexGrow: 1, justifyContent: "center" },

  row: {
    flexDirection: "row", gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
  },
  rowUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  dotColumn: { width: 10, paddingTop: 5 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  info:      { flex: 1, minWidth: 0 },
  title:       { fontSize: 15, color: colors.text },
  titleUnread: { fontWeight: "700" },
  body:        { fontSize: 13, color: colors.textMuted, marginTop: 3, lineHeight: 18 },
  meta:        { fontSize: 11, color: colors.textFaint, marginTop: 5 },
});
