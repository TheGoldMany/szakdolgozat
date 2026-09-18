import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import {
  ApiError, connectWith, MIN_SEARCH_LENGTH, searchUsers,
  type ConnectOutcome, type UserSearchHit,
} from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PersonRow } from "@/components/ui/PersonRow";
import { colors, spacing } from "@/components/ui/theme";

/**
 * Emberek keresése és bejelölése.
 *
 * MIÉRT KÉSLELTETETT A KERESÉS: a szerver percenként 30 keresést enged, és
 * minden leütésre küldeni ennél sokkal többet jelentene — a felhasználó a
 * gépelés közepén kapna 429-et. A 400 ms annyi, hogy egy szó begépelése egy
 * kérés legyen, de a találatok mégis „élőben" jelenjenek meg.
 *
 * A találat MELLÉ jön a kapcsolat állapota, ezért tudja a lista egyből a
 * helyes gombot mutatni, találatonkénti külön kérdés nélkül.
 */

/** Mit írunk ki a bejelölés után? A kölcsönös jelölés maga az elfogadás. */
const OUTCOME_MESSAGE: Record<ConnectOutcome, string> = {
  requested:         "Jelölés elküldve.",
  accepted:          "Ismerősök lettetek – a másik fél már bejelölt téged.",
  already_pending:   "Ezt a jelölést már elküldted.",
  already_connected: "Már ismerősök vagytok.",
  self:              "Magadat nem jelölheted be.",
};

/** Melyik állapotban mi legyen a gomb helyett? `null` = jelölhető. */
const STATE_LABEL: Record<string, string | null> = {
  none:      null,
  declined:  null,   // elutasítás után újra lehet próbálkozni
  connected: "Már ismerősök vagytok",
  outgoing:  "Jelölés elküldve",
  incoming:  "Ő jelölt be téged – az Ismerősök képernyőn fogadhatod el",
};

export default function ConnectionSearchScreen() {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<UserSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [busyId, setBusyId]   = useState<string | null>(null);
  /** Már bejelöltek ebben a munkamenetben – a szerver állapota csak újratöltéskor frissül. */
  const [marked, setMarked]   = useState<Record<string, ConnectOutcome>>({});

  /**
   * Melyik keresés az aktuális?
   *
   * Gyors gépelésnél egy korábbi kérés megérkezhet a későbbi UTÁN, és
   * felülírná a frissebb találatokat — a lista ilyenkor nem ahhoz tartozna,
   * ami a mezőben áll.
   */
  const runId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const mine = ++runId.current;
    const timer = setTimeout(async () => {
      try {
        const { results } = await searchUsers(q);
        if (runId.current !== mine) return;
        setResults(results);
        setError(null);
      } catch (err) {
        if (runId.current !== mine) return;
        setResults([]);
        setError(err instanceof ApiError ? err.userMessage : "A keresés nem sikerült.");
      } finally {
        if (runId.current === mine) setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  async function mark(hit: UserSearchHit) {
    setBusyId(hit.id);
    try {
      const { outcome } = await connectWith(hit.id);
      setMarked((prev) => ({ ...prev, [hit.id]: outcome }));
      Alert.alert("Kész", OUTCOME_MESSAGE[outcome] ?? "Kész.");
    } catch (err) {
      Alert.alert(
        "Nem sikerült a jelölés",
        err instanceof ApiError ? err.userMessage : "Ismeretlen hiba.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const short = query.trim().length > 0 && query.trim().length < MIN_SEARCH_LENGTH;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Field
          label="Keresés név szerint"
          value={query}
          onChangeText={setQuery}
          placeholder="Legalább 2 karakter"
          autoCapitalize="none"
          error={error}
          hint={short ? `Legalább ${MIN_SEARCH_LENGTH} karaktert írj be.` : undefined}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading      ? "Keresés…"
              : short     ? ""
              : query.trim().length >= MIN_SEARCH_LENGTH ? "Nincs találat."
              : "Írd be annak a nevét, akit keresel."}
          </Text>
        }
        renderItem={({ item }) => {
          // A frissen elküldött jelölés felülírja a szervertől kapott
          // állapotot, hogy a gomb ne ugorjon vissza „Bejelölöm"-re.
          const state = marked[item.id]
            ? (marked[item.id] === "accepted" ? "connected" : "outgoing")
            : item.connection.state;
          const label = STATE_LABEL[state] ?? null;

          return (
            <PersonRow person={item}>
              {label
                ? <Text style={styles.stateText}>{label}</Text>
                : <Button
                    title="Bejelölöm"
                    fullWidth={false}
                    loading={busyId === item.id}
                    onPress={() => mark(item)}
                    style={styles.button}
                  />}
            </PersonRow>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: { padding: spacing.lg, paddingBottom: 0 },
  list:      { padding: spacing.lg },
  empty:     { fontSize: 13, color: colors.textFaint, textAlign: "center", marginTop: spacing.xl },
  stateText: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  button:    { marginTop: spacing.sm, alignSelf: "flex-start" },
});
