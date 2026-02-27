import { Tabs } from 'expo-router';
import { Bookmark, Heart, Archive } from 'lucide-react-native';

const ACTIVE   = '#EF4056';
const INACTIVE = '#475569';
const BG       = '#0A0A0F';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:      false,
        tabBarActiveTintColor:   ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor:  BG,
          borderTopColor:   '#1E293B',
          borderTopWidth:   1,
          paddingBottom:    4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:    'My List',
          tabBarIcon: ({ color }) => <Bookmark size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title:    'Favorites',
          tabBarIcon: ({ color }) => <Heart size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title:    'Archive',
          tabBarIcon: ({ color }) => <Archive size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
