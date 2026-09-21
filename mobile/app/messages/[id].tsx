import { useCallback, useRef, useState } from "react";
import {
  Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, ListState, colors, radius, spacing, HIT_SIZE } from "@/components/ui";
import { ApiError, getMessages, sendMessage, type Message } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";

/** A szerver 2000 karakterben maximálja az üzenetet (docs/06, US-06-E). */
const MAX_LENGTH = 2000;

/**
 * Egy beszélgetés (docs/06-messages.md).
 *
 * A lista MEGFORDÍTVA jelenik meg (`inverted`): a legfrissebb üzenet van alul,
 * a képernyő pedig automatikusan ott nyílik. Enélkül minden megnyitáskor a
 * legrégebbi üzenetet látnánk, és görgetni kellene a lényegig.
 *
 * A megnyitás egyben olvasottnak is jelöl: a GET végpont a beérkezett
 * üzeneteket `readAt`-tel látja el, tehát a fejléc olvasatlan-számlálója
 * magától frissül.
 */
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const fetcher = useCallback(() => getMessages(String(id)), [id]);
  const { data, error, loading, reload } = useApi<Message[]>(fetcher, [id]);

  const [draft, setDraft]   = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // A szerver időrendben növekvőn adja; a megfordított listához visszafelé kell.
  const messages = [...(data ?? [])].reverse();

  const tooLong = draft.length > MAX_LENGTH;
  const canSend = draft.trim().length > 0 && !tooLong && !sending;

  async function send() {
    if (!canSend) return;
    const text = draft.trim();
    setSending(true);
    try {
      await sendMessage(String(id), text);
      // Csak sikeres küldés után ürítjük a mezőt: ha elhasal, a felhasználó ne
      // veszítse el, amit begépelt.
      setDraft("");
      reload();
    } catch (err) {
      Alert.alert(
        "Nem sikerült elküldeni",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setSending(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <ListState
          loading={false} error={null} empty
          emptyTitle="Nincs bejelentkezve"
          emptyDescription="Az üzenetek olvasásához jelentkezz be."
        />
        <Button title="Bejelentkezés" onPress={() => router.push("/auth/login")} fullWidth={false} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      // A fejléc magasságát az iOS-en hozzá kell adni, különben a beviteli sor
      // a billentyűzet alá csúszik.
      keyboardVerticalOffset={Platform.OS === "ios" ? 92 : 0}
    >
      <FlatList
        data={messages}
        inverted={messages.length > 0}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[styles.list, messages.length === 0 && styles.emptyList]}
        ListEmptyComponent={
          <ListState
            loading={loading} error={error} empty={!loading && !error}
            emptyTitle="Még nincs üzenet"
            emptyDescription="Írj elsőként a menhelynek."
            onRetry={reload}
          />
        }
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            mine={item.sender.id === user.id}
            onOpenInvite={(token) => router.push(`/apply/${token}`)}
          />
        )}
      />

      <View style={styles.composer}>
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          placeholder="Írj üzenetet…"
          placeholderTextColor={colors.textFaint}
          multiline
          style={[styles.input, tooLong && styles.inputError]}
          accessibilityLabel="Üzenet szövege"
        />
        <TouchableOpacity
          onPress={send}
          disabled={!canSend}
          style={[styles.sendBtn, !canSend && styles.sendOff]}
          accessibilityRole="button"
          accessibilityLabel="Küldés"
        >
          <Text style={styles.sendText}>{sending ? "…" : "Küldés"}</Text>
        </TouchableOpacity>
      </View>
      {tooLong && (
        <Text style={styles.limit}>
          Túl hosszú: {draft.length} / {MAX_LENGTH} karakter.
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}

/**
 * Egy üzenet.
 *
 * A meghívó-üzenetnek nincs szövege, csak `inviteToken`-je — ezért nem
 * buborékként, hanem cselekvésre hívó kártyaként jelenik meg. Ez a mobil
 * egyetlen útja a kérvény-kitöltőhöz.
 */
function MessageBubble({
  message, mine, onOpenInvite,
}: { message: Message; mine: boolean; onOpenInvite: (token: string) => void }) {
  const time = new Date(message.createdAt).toLocaleTimeString("hu-HU", {
    hour: "2-digit", minute: "2-digit",
  });

  if (message.inviteToken) {
    return (
      <View style={styles.invite}>
        <Text style={styles.inviteTitle}>Kérvény meghívó</Text>
        <Text style={styles.inviteText}>
          A menhely elküldte az örökbefogadási kérvényt. Töltsd ki, hogy a
          kérelmed elinduljon.
        </Text>
        <Button
          title="Kérvény kitöltése"
          onPress={() => onOpenInvite(message.inviteToken!)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {!!message.content && (
          <Text style={[styles.text, mine && styles.textMine]}>{message.content}</Text>
        )}
        {!!message.attachmentUrl && (
          <Text style={[styles.attachment, mine && styles.textMine]}>
            Csatolmány: {message.attachmentName ?? "fájl"}
          </Text>
        )}
        <Text style={[styles.time, mine && styles.timeMine]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list:      { padding: spacing.lg, gap: spacing.sm },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  centered:  { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.md },

  bubbleRow: { flexDirection: "row" },
  rowMine:   { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble:    { maxWidth: "80%", borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mine:      { backgroundColor: colors.primary, borderBottomRightRadius: radius.sm },
  theirs:    { backgroundColor: colors.surface, borderBottomLeftRadius: radius.sm },
  text:      { fontSize: 15, color: colors.text, lineHeight: 20 },
  textMine:  { color: "#fff" },
  attachment:{ fontSize: 13, color: colors.textMuted, marginTop: 4, fontStyle: "italic" },
  time:      { fontSize: 10, color: colors.textFaint, marginTop: 4, alignSelf: "flex-end" },
  timeMine:  { color: "rgba(255,255,255,0.75)" },

  invite:      { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.primary },
  inviteTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  inviteText:  { fontSize: 13, color: colors.textMuted, lineHeight: 19 },

  composer: {
    flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1, minHeight: HIT_SIZE, maxHeight: 120,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  sendBtn: {
    minHeight: HIT_SIZE, paddingHorizontal: 18, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  sendOff:  { opacity: 0.45 },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  limit:    { color: colors.dangerDark, fontSize: 12, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
});
