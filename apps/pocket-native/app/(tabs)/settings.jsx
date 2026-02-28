// Settings tab — account info + release notes / changelog.

import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, Tag } from 'lucide-react-native';
import { useAuth }  from '@pocket/core/context';
import { logout }   from '@pocket/core/firebase';

// ── Release notes ─────────────────────────────────────────────────────────────
// Add a new entry at the TOP whenever a notable change ships.
const RELEASES = [
  {
    version: '1.2',
    date:    'Feb 28, 2026',
    items: [
      'YouTube videos now play directly inside the app',
      'LinkedIn, Reddit & other social links open instantly in your browser — no more blank reader screen',
      'Fixed AI summary error message (was referencing wrong API key)',
    ],
  },
  {
    version: '1.1',
    date:    'Feb 27, 2026',
    items: [
      'React Native app launched on iOS & Android',
      'AI article summarizer powered by Groq (free)',
      'YouTube video player with transcript view',
      'Share any link from any app directly to Pocket',
      'Favorites & Archive tabs',
    ],
  },
  {
    version: '1.0',
    date:    'Feb 27, 2026',
    items: [
      'Web PWA — save and read articles from any browser',
      'Clean reader view strips ads and distractions',
      'Dark mode reader',
      'Install to home screen on iOS & Android',
    ],
  },
];

export default function Settings() {
  const { user } = useAuth();
  const router   = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* ── Account ─────────────────────────────────────────────── */}
        <Text style={s.sectionHeader}>Account</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>Signed in as</Text>
            <Text style={s.value} numberOfLines={1}>{user?.email}</Text>
          </View>
          <View style={s.divider} />
          <TouchableOpacity style={s.row} onPress={handleLogout}>
            <LogOut size={16} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={s.danger}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ── What's New ──────────────────────────────────────────── */}
        <Text style={s.sectionHeader}>What's New</Text>
        {RELEASES.map((rel) => (
          <View key={rel.version} style={s.card}>
            <View style={s.releaseHeader}>
              <View style={s.versionBadge}>
                <Tag size={11} color="#EF4056" />
                <Text style={s.versionText}>v{rel.version}</Text>
              </View>
              <Text style={s.releaseDate}>{rel.date}</Text>
            </View>
            {rel.items.map((item, i) => (
              <View key={i} style={s.bulletRow}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={s.footer}>Pocket · built with ☕</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#0A0A0F' },
  scroll:        { padding: 16, paddingBottom: 48 },

  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#475569',
                   textTransform: 'uppercase', letterSpacing: 1,
                   marginTop: 24, marginBottom: 8, marginLeft: 4 },

  card:          { backgroundColor: '#13131A', borderRadius: 12,
                   borderWidth: 1, borderColor: '#1E293B',
                   marginBottom: 12, overflow: 'hidden' },

  row:           { flexDirection: 'row', alignItems: 'center',
                   paddingHorizontal: 16, paddingVertical: 14 },
  divider:       { height: 1, backgroundColor: '#1E293B', marginHorizontal: 16 },
  label:         { fontSize: 14, color: '#94A3B8', marginRight: 8 },
  value:         { flex: 1, fontSize: 14, color: '#F1F5F9', textAlign: 'right' },
  danger:        { fontSize: 14, color: '#EF4444', fontWeight: '600' },

  releaseHeader: { flexDirection: 'row', alignItems: 'center',
                   justifyContent: 'space-between',
                   paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  versionBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4,
                   backgroundColor: '#1E1020', paddingHorizontal: 8,
                   paddingVertical: 3, borderRadius: 20,
                   borderWidth: 1, borderColor: '#3D1530' },
  versionText:   { fontSize: 12, fontWeight: '700', color: '#EF4056' },
  releaseDate:   { fontSize: 12, color: '#475569' },

  bulletRow:     { flexDirection: 'row', paddingHorizontal: 16,
                   paddingVertical: 5, gap: 8 },
  bullet:        { fontSize: 14, color: '#EF4056', lineHeight: 20 },
  bulletText:    { flex: 1, fontSize: 14, color: '#CBD5E1', lineHeight: 20 },

  footer:        { textAlign: 'center', fontSize: 12, color: '#334155',
                   marginTop: 24 },
});
