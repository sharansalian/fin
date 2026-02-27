import { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth }       from '@pocket/core/context';
import { getArticles }   from '@pocket/core/firebase';
import ArticleCard from '../../components/ArticleCard';

export default function Favorites() {
  const { user } = useAuth();
  const router   = useRouter();
  const [articles,   setArticles]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try   { setArticles(await getArticles(user.uid, { isFavorite: true })); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user.uid]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.centered}><ActivityIndicator color="#EF4056" size="large" /></View>;

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={articles}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            onPress={() => router.push(`/read/${item.id}`)}
            onUpdate={(data) => setArticles((prev) => prev.map((a) => a.id === item.id ? { ...a, ...data } : a).filter((a) => a.isFavorite))}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#EF4056" />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>❤️</Text>
            <Text style={s.emptyTitle}>No favorites yet</Text>
            <Text style={s.emptySub}>Swipe left on an article and tap the heart.</Text>
          </View>
        }
        contentContainerStyle={articles.length === 0 ? s.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#0A0A0F' },
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0F' },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyIcon:      { fontSize: 48 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  emptySub:       { fontSize: 14, color: '#475569', textAlign: 'center', maxWidth: 260 },
});
