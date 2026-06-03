import { useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { BASE_URL } from "@/lib/api";

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert("Hiányzó adat", "Töltsd ki az összes mezőt.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Rövid jelszó", "A jelszónak legalább 8 karakter hosszúnak kell lennie.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Sikertelen regisztráció");
      }
      Alert.alert("Sikeres regisztráció!", "Mostantól be tudsz jelentkezni.", [
        { text: "OK", onPress: () => router.replace("/auth/login") },
      ]);
    } catch (err: any) {
      Alert.alert("Hiba", err?.message ?? "Próbáld újra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.subtitle}>Hozz létre fiókot az örökbefogadáshoz!</Text>

        <TextInput
          style={styles.input}
          placeholder="Teljes neve"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
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
          placeholder="Jelszó (min. 8 karakter)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "…" : "Regisztráció"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/auth/login")}>
          <Text style={styles.link}>Már van fiókom → Bejelentkezés</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  form: { padding: 24, paddingTop: 32 },
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
