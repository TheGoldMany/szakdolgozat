import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View,
  type ListRenderItem, type StyleProp, type ViewStyle } from "react-native";
import type { PagedState } from "@/lib/use-api";
import { ListState } from "./ScreenState";
import { colors, spacing } from "./theme";

interface Props<T> {
  /** A `usePagedList` visszaadott állapota – egyben adjuk át, hogy ne lehessen egy darabját elfelejteni. */
  state:      PagedState<T>;
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  emptyTitle:  string;
  emptyDescription?: string;
  loadingLabel?: string;
  /** A lista fölé kerülő rész (szűrők, keresőmező). Görgetéskor együtt mozog. */
  header?:    React.ReactElement | null;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Lapozott lista a hozzá tartozó állapotokkal.
 *
 * A `usePagedList` és ez a komponens párban dolgozik: az egyik az adatot
 * kezeli, a másik megjeleníti — a képernyőnek se `FlatList`-et, se töltés- és
 * hibaágat nem kell írnia.
 *
 * Miért az egész állapot megy át egy propban? Mert így nem lehet a felét
 * elfelejteni. Ha a `refreshing`-et, a `loadMore`-t és a hibaágat külön-külön
 * kellene bekötni, előbb-utóbb kimaradna valamelyik — és épp a hibaág az, ami
 * eddig is kimaradt.
 *
 * Az üres állapot a LISTÁN BELÜL jelenik meg (`ListEmptyComponent`), nem
 * helyette: így a lehúzásos frissítés akkor is működik, amikor nincs egy elem
 * sem — különben a felhasználó nem tudná újrapróbálni a legkézenfekvőbb
 * mozdulattal.
 */
export function DataList<T>({
  state, renderItem, keyExtractor,
  emptyTitle, emptyDescription, loadingLabel, header, contentStyle,
}: Props<T>) {
  const { items, error, loading, refreshing, loadingMore, refresh, loadMore } = state;

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={header}
      contentContainerStyle={[
        styles.content,
        // Üres listánál a tartalom töltse ki a képernyőt, hogy az üzenet
        // középen legyen, ne a lap tetejére tapadva.
        items.length === 0 && styles.emptyContent,
        contentStyle,
      ]}
      ListEmptyComponent={
        <ListState
          loading={loading}
          error={error}
          empty={!loading && !error}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          loadingLabel={loadingLabel}
          onRetry={refresh}
        />
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
      onEndReached={loadMore}
      // 0.4 = a lista aljától mért képernyőnyi távolság. Nagyobb érték túl
      // korán kérné a következő lapot, kisebbnél a felhasználó megvárná a
      // töltést a lista végén.
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore
          ? <View style={styles.footer}><ActivityIndicator color={colors.primary} /></View>
          : null
      }
      // Bővítés közben fellépő hiba: a már látható elemek maradnak, csak a
      // következő lap hiányzik. Ilyenkor nem ürítjük a listát, de jelezzük.
      ListFooterComponentStyle={styles.footerWrap}
    />
  );
}

const styles = StyleSheet.create({
  content:      { padding: spacing.lg, gap: spacing.md },
  emptyContent: { flexGrow: 1, justifyContent: "center" },
  footer:       { paddingVertical: spacing.lg },
  footerWrap:   { width: "100%" },
});
