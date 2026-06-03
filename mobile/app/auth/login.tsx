import { useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Hiányzó adat", "Töltsd ki mindkét mezőt.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/profile");
    } catch (err: any) {
      Alert.alert("Bejelentkezési hiba", err?.message ?? "Ellenőrizd az adataidat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.form}>
        <Text style={styles.subtitle}>Lépj be, hogy kérelmet nyújts be!</Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail cím"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Jelszó"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "…" : "Bejelentkezés"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/auth/register")}>
          <Text style={styles.link}>Még nincs fiókom → Regisztráció</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  form: { flex: 1, padding: 24, justifyContent: "center" },
  subtitle:  { fontSize: 15, color: "#6B7280", marginBottom: 24, textAlign: "center" },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: "#111827", marginBottom: 12, backgroundColor: "#F9FAFB",
  },
  btn: {
    backgroundColor: "#2563EB", borderRadius: 10,
    paddingVertical: 14, alignItems: "center", marginTop: 4, marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link:    { textAlign: "center", color: "#2563EB", fontSize: 14 },
});
