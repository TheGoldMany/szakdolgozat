import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="animals/[id]" options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="auth/login" options={{ headerShown: true, title: "Bejelentkezés" }} />
        <Stack.Screen name="auth/register" options={{ headerShown: true, title: "Regisztráció" }} />
      </Stack>
    </AuthProvider>
  );
}
