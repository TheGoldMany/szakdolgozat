import {
  ActivityIndicator, StyleSheet, Text, TouchableOpacity,
  type StyleProp, type ViewStyle,
} from "react-native";
import { colors, radius, HIT_SIZE } from "./theme";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

interface Props {
  title:      string;
  onPress:    () => void;
  variant?:   ButtonVariant;
  /** Töltés közben a gomb letiltva marad, hogy ne lehessen kétszer elküldeni. */
  loading?:   boolean;
  disabled?:  boolean;
  fullWidth?: boolean;
  style?:     StyleProp<ViewStyle>;
}

/**
 * Gomb.
 *
 * A `loading` szándékosan letiltja is a gombot: enélkül a felhasználó a
 * várakozás alatt újra rábökhetne, és kétszer küldené el ugyanazt a kérelmet
 * vagy üzenetet. A pörgő jelző a feliratot VÁLTJA, nem mellé kerül — így a
 * gomb szélessége nem ugrik meg töltés közben.
 */
export function Button({
  title, onPress, variant = "primary",
  loading = false, disabled = false, fullWidth = true, style,
}: Props) {
  const off = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={[
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        off && styles.off,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#fff" : colors.primary} />
        : <Text style={[styles.text, textStyles[variant]]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight:       HIT_SIZE,
    borderRadius:    radius.md,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems:      "center",
    justifyContent:  "center",
  },
  fullWidth: { alignSelf: "stretch" },
  // A tompítás a letiltott állapot egyetlen jele, ezért nem lehet túl finom.
  off:       { opacity: 0.55 },
  primary:   { backgroundColor: colors.primary },
  danger:    { backgroundColor: colors.danger },
  outline:   { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface },
  ghost:     { backgroundColor: "transparent" },
  text:      { fontSize: 15, fontWeight: "700" },
});

const textStyles = StyleSheet.create({
  primary: { color: "#fff" },
  danger:  { color: "#fff" },
  outline: { color: colors.primary },
  ghost:   { color: colors.primary },
});
