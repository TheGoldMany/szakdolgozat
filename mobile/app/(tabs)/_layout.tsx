import { Tabs } from "expo-router";
import { Text } from "react-native";

function Icon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export default function TabsLayout() {
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
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: () => <Icon label="👤" />,
        }}
      />
    </Tabs>
  );
}
