import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { FavoritesProvider } from "@/lib/favorites";
import { usePush } from "@/lib/use-push";

/**
 * A push bekötése. Külön komponens, mert az `AuthProvider`-en BELÜL kell
 * futnia (tudnia kell, ki van bejelentkezve), a szolgáltató viszont a
 * `RootLayout`-ban jön létre — saját magán belül nem hívható a hookja.
 */
function PushBridge() {
  usePush();
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* A kedvencek a bejelentkezett felhasználóhoz tartoznak, ezért az
          AuthProvider-en BELÜL van – így ki-/bejelentkezéskor újratölt. */}
      <FavoritesProvider>
      <PushBridge />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="favorites/index" options={{ headerShown: true, title: "Kedvenceim" }} />
        <Stack.Screen name="map/index" options={{ headerShown: true, title: "Térkép" }} />
        <Stack.Screen name="events/index" options={{ headerShown: true, title: "Események" }} />
        <Stack.Screen name="events/[id]" options={{ headerShown: true, title: "Esemény" }} />
        <Stack.Screen name="notifications/index" options={{ headerShown: true, title: "Értesítések" }} />
        <Stack.Screen name="notifications/settings" options={{ headerShown: true, title: "Értesítési beállítások" }} />
        <Stack.Screen name="reports/new" options={{ headerShown: true, title: "Új bejelentés" }} />
        <Stack.Screen name="daily/new" options={{ headerShown: true, title: "Napi kép" }} />
        <Stack.Screen name="appointments/index" options={{ headerShown: true, title: "Időpontjaim" }} />
        <Stack.Screen name="appointments/new" options={{ headerShown: true, title: "Időpontfoglalás" }} />
        <Stack.Screen name="messages/index" options={{ headerShown: true, title: "Üzenetek" }} />
        <Stack.Screen name="messages/[id]" options={{ headerShown: true, title: "Beszélgetés" }} />
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
