// My List tab — mirrors the web app's MyList page.
//
// What this screen does:
//   1. On mount: loads the user's unread, unarchived articles from Firestore
//   2. Watches for share intents (expo-share-intent) — when the user taps
//      "Pocket" in the iOS/Android share sheet, shareIntent fires here,
//      the URL is saved and the list refreshes automatically.
//   3. Pull-to-refresh for manual reload.

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { Search } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth }                       from '@pocket/core/context';
import { getArticles, addArticle, updateArticle } from '@pocket/core/firebase';
import { fetchMetadataOnly, isSocialUrl } from '@pocket/core/utils';
import ArticleCard from '../../components/ArticleCard';

export default function MyList() {
  const { user }   = useAuth();
  const router     = useRouter();
  const [articles,   setArticles]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  // ── Share intent ──────────────────────────────────────────────────────────
  // This is the native equivalent of the web's PWA share_target.
  // When the user shares a URL from Safari/Chrome/any app to Pocket,
  // hasShareIntent becomes true and shareIntent.webUrl contains the URL.
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;

    const url = shareIntent.webUrl || shareIntent.text || '';
    if (!url) { resetShareIntent(); return; }

    (async () => {
      const domain = (() => { try { return new URL(url).hostname.replace('www.', ''); } catch { return url; } })();
      const ref = await addArticle(user.uid, {
        url, title: domain, excerpt: '', heroImage: '', domain,
        tags: [], estimatedReadTime: 0, content: '', fetchStatus: 'pending',
      });
      fetchMetadataOnly(url).then((meta) =>
        updateArticle(user.uid, ref.id, {
          title: meta.title || domain, excerpt: meta.excerpt,
          heroImage: meta.heroImage,  domain:   meta.domain,
        }).catch(() => {})
      );
      resetShareIntent();
      loadArticles(true);
    })();
  }, [hasShareIntent, shareIntent]); // eslint-disable-line

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadArticles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getArticles(user.uid, { isArchived: false });
      setArticles(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.uid]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = search
    ? articles.filter((a) =>
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.domain?.toLowerCase().includes(search.toLowerCase())
      )
    : articles;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color="#EF4056" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Search bar */}
      <View style={s.searchWrap}>
        <Search size={16} color="#475569" style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search articles…"
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            onPress={() => isSocialUrl(item.url)
              ? WebBrowser.openBrowserAsync(item.url)
              : router.push(`/read/${item.id}`)
            }
            onUpdate={(data) =>
              setArticles((prev) =>
                prev.map((a) => a.id === item.id ? { ...a, ...data } : a)
                    .filter((a) => !data.isArchived || a.id !== item.id)
              )
            }
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadArticles(true)}
            tintColor="#EF4056"
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📚</Text>
            <Text style={s.emptyTitle}>Nothing saved yet</Text>
            <Text style={s.emptySub}>Tap Share → Pocket in any app to save a link.</Text>
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? s.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#0A0A0F' },
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0F' },
  searchWrap:     { flexDirection: 'row', alignItems: 'center', margin: 12,
                    backgroundColor: '#13131A', borderRadius: 10, paddingHorizontal: 12 },
  searchIcon:     { marginRight: 8 },
  searchInput:    { flex: 1, height: 40, color: '#F1F5F9', fontSize: 14 },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyIcon:      { fontSize: 48 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  emptySub:       { fontSize: 14, color: '#475569', textAlign: 'center', maxWidth: 260 },
});
