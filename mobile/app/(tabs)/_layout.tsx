import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "@/lib/auth";

function Icon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export default function TabsLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === "SHELTER_ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",
        headerStyle: { backgroundColor: "#fff" },
        headerTitleStyle: { fontWeight: "700", color: "#111827" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Állatok",
          tabBarIcon: ({ focused }) => <Icon label={focused ? "🐾" : "🐾"} />,
        }}
      />
      <Tabs.Screen
        name="shelters"
        options={{
          title: "Menhelyek",
          tabBarIcon: () => <Icon label="🏠" />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Menhelyem",
          tabBarIcon: () => <Icon label="📋" />,
          // Csak menhely adminnak / super adminnak látszik
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: () => <Icon label="👤" />,
        }}
      />
    </Tabs>
  );
}
