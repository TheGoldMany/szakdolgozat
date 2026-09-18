import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./theme";

interface Props {
  person: { name: string | null; image: string | null; city: string | null };
  /** A sorhoz tartozó műveletek (gombok, állapotszöveg). */
  children?: React.ReactNode;
}

/**
 * Egy ember sora avatarral.
 *
 * Az ismerőslista és a keresés ugyanezt mutatja, ezért közös komponens — és
 * azért nem a képernyőben, mert egy útvonalfájlból importálni egy másik
 * útvonalba működik ugyan, de az `app/` mappa a navigációé, nem a megosztott
 * komponenseké.
 */
export function PersonRow({ person, children }: Props) {
  const initial = person.name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        {person.image
          ? <Image source={{ uri: person.image }} style={styles.avatar} />
          : <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>}
        <View style={styles.rowText}>
          {/* A név a séma szerint nullázható, ezért van tartalék szöveg —
              üres sor semmit nem mondana a felhasználónak. */}
          <Text style={styles.name}>{person.name ?? "Névtelen felhasználó"}</Text>
          {!!person.city && <Text style={styles.city}>{person.city}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  rowTop:  { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowText: { flex: 1 },
  avatar:  { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: colors.primary },
  name:    { fontSize: 15, fontWeight: "600", color: colors.text },
  city:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
