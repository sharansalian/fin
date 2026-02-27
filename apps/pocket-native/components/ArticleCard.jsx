// Native ArticleCard — mirrors the web ArticleCard but uses RN primitives.
//
// Swipe actions: heart (favorite) and archive (left swipe actions coming
// in v2 with react-native-gesture-handler). For now, long-press shows
// a simple action row inline.

import { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Heart, Archive, Trash2 } from 'lucide-react-native';
import { useAuth }                        from '@pocket/core/context';
import { updateArticle, deleteArticle }   from '@pocket/core/firebase';

export default function ArticleCard({ article, onPress, onUpdate }) {
  const { user }   = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [saving, setSaving] = useState(false);

  const handle = async (fn) => {
    setSaving(true);
    try { await fn(); }
    finally { setSaving(false); setShowActions(false); }
  };

  const favorite = () =>
    handle(async () => {
      const next = !article.isFavorite;
      await updateArticle(user.uid, article.id, { isFavorite: next });
      onUpdate?.({ isFavorite: next });
    });

  const archive = () =>
    handle(async () => {
      await updateArticle(user.uid, article.id, { isArchived: true });
      onUpdate?.({ isArchived: true });
    });

  const remove = () =>
    handle(async () => {
      await deleteArticle(user.uid, article.id);
      onUpdate?.({ _deleted: true });
    });

  const mins = article.estimatedReadTime;

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.75}
      onPress={onPress}
      onLongPress={() => setShowActions((v) => !v)}
    >
      <View style={s.body}>
        <Text style={s.title} numberOfLines={2}>{article.title || article.url}</Text>
        <View style={s.meta}>
          <Text style={s.domain}>{article.domain}</Text>
          {mins > 0 && <Text style={s.readTime}> · {mins} min</Text>}
        </View>
        {article.excerpt ? (
          <Text style={s.excerpt} numberOfLines={2}>{article.excerpt}</Text>
        ) : null}
      </View>

      {article.heroImage ? (
        <Image source={{ uri: article.heroImage }} style={s.thumb} />
      ) : null}

      {/* Action row (shown on long-press) */}
      {showActions && (
        <View style={s.actionRow}>
          {saving
            ? <ActivityIndicator color="#EF4056" size="small" />
            : <>
                <TouchableOpacity style={s.actionBtn} onPress={favorite}>
                  <Heart size={18} color={article.isFavorite ? '#EF4056' : '#94A3B8'}
                         fill={article.isFavorite ? '#EF4056' : 'none'} />
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={archive}>
                  <Archive size={18} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={remove}>
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </>
          }
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:      { flexDirection: 'row', padding: 16, borderBottomWidth: 1,
               borderBottomColor: '#1E293B', backgroundColor: '#0A0A0F', gap: 12 },
  body:      { flex: 1, gap: 4 },
  title:     { fontSize: 15, fontWeight: '600', color: '#F1F5F9', lineHeight: 20 },
  meta:      { flexDirection: 'row', alignItems: 'center' },
  domain:    { fontSize: 12, color: '#94A3B8' },
  readTime:  { fontSize: 12, color: '#94A3B8' },
  excerpt:   { fontSize: 13, color: '#475569', lineHeight: 18 },
  thumb:     { width: 72, height: 72, borderRadius: 8, backgroundColor: '#13131A' },
  actionRow: { position: 'absolute', bottom: 0, left: 0, right: 0,
               flexDirection: 'row', backgroundColor: '#13131A',
               borderTopWidth: 1, borderTopColor: '#1E293B',
               paddingVertical: 8, paddingHorizontal: 16, gap: 8, justifyContent: 'flex-end' },
  actionBtn: { padding: 8 },
});
