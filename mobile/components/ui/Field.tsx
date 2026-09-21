import { useState } from "react";
import {
  StyleSheet, Text, TextInput, View,
  type KeyboardTypeOptions, type TextInputProps,
} from "react-native";
import { colors, radius, HIT_SIZE } from "./theme";

interface Props {
  label:        string;
  value:        string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Hibaüzenet a mező alatt. Ha van, a keret is pirosra vált. */
  error?:       string | null;
  /** Rövid magyarázat a mező alatt, ha nincs hiba. */
  hint?:        string;
  secure?:      boolean;
  multiline?:   boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoComplete?:   TextInputProps["autoComplete"];
  editable?:    boolean;
  maxLength?:   number;
}

/**
 * Címkézett beviteli mező hibaüzenettel.
 *
 * A hiba a MEZŐ ALATT jelenik meg, nem felugró ablakban: az `Alert` kiszakítja
 * a felhasználót a kitöltésből, és nem mutatja meg, melyik mezőről van szó. A
 * keret pirosra váltása azért kell mellé, mert a szöveg egyedül könnyen
 * elsikkad egy hosszabb űrlapon.
 *
 * A hibát és a magyarázatot ugyanaz a sor mutatja, hogy a mező magassága ne
 * ugráljon, amikor hiba jelenik meg vagy tűnik el.
 */
export function Field({
  label, value, onChangeText, placeholder, error, hint,
  secure = false, multiline = false, keyboardType, autoCapitalize,
  autoComplete, editable = true, maxLength,
}: Props) {
  const [focused, setFocused] = useState(false);
  const message = error ?? hint;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        secureTextEntry={secure}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        editable={editable}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
          !editable && styles.disabled,
        ]}
      />
      {!!message && (
        <Text style={[styles.message, !!error && styles.errorText]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    minHeight:       HIT_SIZE,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    paddingHorizontal: 12,
    paddingVertical:   11,
    fontSize:        15,
    color:           colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  focused:   { borderColor: colors.primary },
  errored:   { borderColor: colors.danger },
  disabled:  { backgroundColor: colors.background, color: colors.textMuted },
  message:   { marginTop: 5, fontSize: 12, color: colors.textMuted },
  errorText: { color: colors.dangerDark },
});
