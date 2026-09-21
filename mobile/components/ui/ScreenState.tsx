import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ApiError } from "@/lib/api";
import { Button } from "./Button";
import { colors, spacing } from "./theme";

/**
 * A három állapot, amit minden adatot mutató képernyő ismer: töltés, hiba,
 * üresség.
 *
 * Miért egy fájlban? Mert a hármat mindig együtt kell végiggondolni, és a
 * leggyakoribb hiba az, hogy a hiba ága kimarad — ilyenkor a felhasználó üres
 * listát lát, és azt hiszi, nincs találat. A `ListState` épp ezt a döntést
 * kényszeríti ki: egy helyen kell megadni mindhármat.
 */

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {!!label && <Text style={styles.muted}>{label}</Text>}
    </View>
  );
}

export function EmptyState({
  title, description,
}: { title: string; description?: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.muted}>{description}</Text>}
    </View>
  );
}

/**
 * Hibaállapot újrapróbálással.
 *
 * Az `ApiError.userMessage` már magyarul megfogalmazott, a hiba fajtájához
 * illő mondat („Nincs internetkapcsolat", „A munkamenet lejárt"…) — ezért azt
 * mutatjuk, nem a nyers technikai üzenetet.
 *
 * Újrapróbálás gomb csak akkor van, ha van értelme: lejárt munkamenetnél az
 * API-réteg már kijelentkeztetett, ott az újrapróbálás ugyanoda vezetne.
 */
export function ErrorState({
  error, onRetry,
}: { error: ApiError | Error; onRetry?: () => void }) {
  const api = error instanceof ApiError ? error : null;
  const message = api ? api.userMessage : (error.message || "Ismeretlen hiba.");
  const retryable = !api || api.kind !== "unauthorized";

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Nem sikerült betölteni</Text>
      <Text style={styles.muted}>{message}</Text>
      {retryable && onRetry && (
        <Button
          title="Újra"
          variant="outline"
          fullWidth={false}
          onPress={onRetry}
          style={styles.retry}
        />
      )}
    </View>
  );
}

/**
 * A három állapot egyben, a helyes sorrendben.
 *
 * A sorrend nem mindegy: a HIBA megelőzi az ürességet. Ha fordítva lenne, egy
 * elhasalt lekérés „nincs találat"-ként jelenne meg, és a felhasználó a
 * szűrőjét kezdené igazgatni ahelyett, hogy újrapróbálná.
 *
 * Ha mindhárom feltétel hamis, `null`-t ad — ilyenkor a hívó a saját tartalmát
 * rajzolja.
 */
export function ListState({
  loading, error, empty, emptyTitle, emptyDescription, onRetry, loadingLabel,
}: {
  loading:  boolean;
  error:    ApiError | null;
  empty:    boolean;
  emptyTitle: string;
  emptyDescription?: string;
  onRetry?: () => void;
  loadingLabel?: string;
}) {
  if (loading) return <Loading label={loadingLabel} />;
  if (error)   return <ErrorState error={error} onRetry={onRetry} />;
  if (empty)   return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return null;
}

const styles = StyleSheet.create({
  center: {
    paddingVertical:   spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems:     "center",
    justifyContent: "center",
    gap:            spacing.sm,
  },
  title: { fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "center" },
  muted: { fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  retry: { marginTop: spacing.md },
});
