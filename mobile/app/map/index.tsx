import { useCallback, useMemo, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { getMapData } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import {
  buildMarkers, findEntity, INITIAL_CAMERA, LAYER_COLORS, LAYER_LABELS,
  REPORT_TYPE_LABELS, type MapEntity, type MarkerLayer,
} from "@/lib/map-markers";
import { ErrorState, Loading } from "@/components/ui/ScreenState";
import { colors, radius, spacing } from "@/components/ui/theme";

/**
 * Térkép.
 *
 * MIÉRT NEM A WEBES MEGOLDÁS: a weben Leaflet fut, ami böngészős DOM-ra épül,
 * és `ssr: false` dinamikus importtal van elrejtve a szerver elől — natív
 * appban nincs DOM, amire ráülhetne. Itt `expo-maps` megy: Androidon Google
 * Maps, iOS-en Apple Maps, tehát valódi natív térkép.
 *
 * AZ EXPO-MAPS-NEK NINCS KÖZÖS KOMPONENSE: `GoogleMaps.View` és
 * `AppleMaps.View` külön létezik, eltérő tulajdonságokkal. Ezért van két ág.
 * Ami KÖZÖS bennük — a jelölők összeállítása és a koppintás visszafejtése —,
 * az a `lib/map-markers.ts`-ben van, hogy ne kelljen kétszer karbantartani.
 *
 * Androidon a jelölő NEM színezhető (a Google jelölő csak saját képet fogad
 * el), ezért ott a réteget a buborék szövege és a jelmagyarázat különbözteti
 * meg. iOS-en a `tintColor` megy.
 */

const ALL_VISIBLE: Record<MarkerLayer, boolean> = { shelter: true, report: true, vet: true };

export default function MapScreen() {
  const { data, error, loading, reload } = useApi(useCallback(() => getMapData(), []), []);
  const [visible, setVisible]   = useState<Record<MarkerLayer, boolean>>(ALL_VISIBLE);
  const [selected, setSelected] = useState<MapEntity | null>(null);

  const markers = useMemo(
    () => (data ? buildMarkers(data, visible) : []),
    [data, visible],
  );

  function toggle(layer: MarkerLayer) {
    setVisible((prev) => ({ ...prev, [layer]: !prev[layer] }));
    // A kiválasztott elem eltűnhet a szűrővel; ilyenkor a kártya is menjen.
    setSelected(null);
  }

  const onMarkerClick = useCallback(
    (marker: { id?: string }) => { if (data) setSelected(findEntity(data, marker.id)); },
    [data],
  );

  if (loading && !data) return <Loading label="Térkép betöltése…" />;
  if (error && !data)   return <ErrorState error={error} onRetry={reload} />;

  const mapProps = {
    style: styles.map,
    cameraPosition: INITIAL_CAMERA,
    markers,
    onMarkerClick,
  };

  return (
    <View style={styles.container}>
      {Platform.OS === "ios"
        ? <AppleMaps.View {...mapProps} uiSettings={{ myLocationButtonEnabled: false }} />
        : <GoogleMaps.View {...mapProps} uiSettings={{ myLocationButtonEnabled: false }} />}

      {/* Rétegszűrő. Nem kér új adatot: a jelölők helyben szűrődnek, így a
          váltás azonnali, és offline is működik, ha már betöltött. */}
      <View style={styles.filters}>
        {(Object.keys(LAYER_LABELS) as MarkerLayer[]).map((layer) => (
          <Pressable
            key={layer}
            onPress={() => toggle(layer)}
            style={[styles.chip, visible[layer] && { backgroundColor: LAYER_COLORS[layer], borderColor: LAYER_COLORS[layer] }]}
            accessibilityRole="button"
            accessibilityState={{ selected: visible[layer] }}
          >
            <Text style={[styles.chipText, visible[layer] && styles.chipTextOn]}>
              {LAYER_LABELS[layer]}
            </Text>
          </Pressable>
        ))}
      </View>

      {selected && <DetailCard entity={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

/**
 * A kiválasztott jelölő részletei.
 *
 * MIÉRT KÁRTYA ÉS NEM ÚJ KÉPERNYŐ: a menhelynek és a bejelentésnek nincs saját
 * mobil képernyője, a térképről viszont a legtöbb esetben nem böngészni akar a
 * felhasználó, hanem TELEFONÁLNI vagy útvonalat kérni. Ezt a kártya egy
 * koppintással megadja, és a térkép közben látszik marad.
 */
function DetailCard({ entity, onClose }: { entity: MapEntity; onClose: () => void }) {
  const rows: { label: string; value: string }[] = [];
  let title = "";
  let phone: string | null = null;
  let navigateTo: string | null = null;
  let website: string | null = null;

  if (entity.layer === "shelter") {
    const s = entity.data;
    title = s.name;
    rows.push({ label: "Település", value: s.city });
    if (s.address) rows.push({ label: "Cím", value: s.address });
    rows.push({ label: "Örökbefogadható", value: `${s._count.animals} állat` });
    phone      = s.phone;
    navigateTo = s.address ? `${s.address}, ${s.city}` : s.city;
  } else if (entity.layer === "report") {
    const r = entity.data;
    title = `${REPORT_TYPE_LABELS[r.type] ?? r.type} ${r.name ?? r.breed ?? "állat"}`;
    rows.push({ label: "Település", value: r.city });
    rows.push({ label: "Bejelentve", value: new Date(r.createdAt).toLocaleDateString("hu-HU") });
    rows.push({ label: "Leírás", value: r.description });
    if (r.contactName) rows.push({ label: "Kapcsolat", value: r.contactName });
    phone      = r.contactPhone;
    navigateTo = r.city;
  } else {
    const v = entity.data;
    title = v.name;
    rows.push({ label: "Település", value: v.city });
    if (v.address)      rows.push({ label: "Cím", value: v.address });
    if (v.openingHours) rows.push({ label: "Nyitvatartás", value: v.openingHours });
    if (v.isEmergency)  rows.push({ label: "Ügyelet", value: "Igen" });
    phone      = v.phone;
    website    = v.website;
    navigateTo = v.address ? `${v.address}, ${v.city}` : v.city;
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.dot, { backgroundColor: LAYER_COLORS[entity.layer] }]} />
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
        <Pressable
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Bezárás"
        >
          <Text style={styles.close}>×</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.cardBody}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        {!!phone && (
          <Pressable style={styles.action} onPress={() => Linking.openURL(`tel:${phone}`)}>
            <Text style={styles.actionText}>Hívás</Text>
          </Pressable>
        )}
        {!!navigateTo && (
          <Pressable
            style={styles.action}
            // A rendszer térképalkalmazását nyitja meg útvonaltervre. Ehhez
            // nem kell helyadat: a cél címét adjuk át, a kiindulást a
            // navigációs app kéri be, ha kell.
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(navigateTo!)}`)}
          >
            <Text style={styles.actionText}>Útvonal</Text>
          </Pressable>
        )}
        {!!website && (
          <Pressable style={styles.action} onPress={() => Linking.openURL(website!)}>
            <Text style={styles.actionText}>Weboldal</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map:       { flex: 1 },

  filters: {
    position: "absolute", top: spacing.md, left: spacing.md, right: spacing.md,
    flexDirection: "row", gap: spacing.sm, flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText:   { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  chipTextOn: { color: "#fff" },

  card: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    maxHeight: "50%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    // Az árnyék nélkül a kártya beleolvadna a térképbe.
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  cardTitle:  { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  close:      { fontSize: 24, color: colors.textFaint, lineHeight: 26 },

  cardBody: { flexGrow: 0 },
  row:       { flexDirection: "row", gap: spacing.md, marginBottom: 6 },
  rowLabel:  { width: 110, fontSize: 12, color: colors.textMuted },
  rowValue:  { flex: 1, fontSize: 13, color: colors.text },

  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  action: {
    flex: 1, minHeight: 44, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  actionText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
});
