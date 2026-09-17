import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { FavoritesProvider } from "@/lib/favorites";

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* A kedvencek a bejelentkezett felhasználóhoz tartoznak, ezért az
          AuthProvider-en BELÜL van – így ki-/bejelentkezéskor újratölt. */}
      <FavoritesProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="favorites/index" options={{ headerShown: true, title: "Kedvenceim" }} />
        <Stack.Screen name="applications/index" options={{ headerShown: true, title: "Kérelmeim" }} />
        <Stack.Screen name="apply/[token]" options={{ headerShown: true, title: "Örökbefogadási kérvény" }} />
        <Stack.Screen name="animals/[id]" options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="auth/login" options={{ headerShown: true, title: "Bejelentkezés" }} />
        <Stack.Screen name="auth/register" options={{ headerShown: true, title: "Regisztráció" }} />
      </Stack>
      </FavoritesProvider>
    </AuthProvider>
  );
}
