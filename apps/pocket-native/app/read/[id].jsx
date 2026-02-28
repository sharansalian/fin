// Article Reader screen.
//
// Uses WebView to render the article's full HTML content exactly like
// the web Reader, injecting the same CSS variables for dark mode.
// Falls back to opening the original URL in a browser if content is missing.

import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Heart, Archive, ExternalLink } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth }                    from '@pocket/core/context';
import { getArticle, updateArticle }  from '@pocket/core/firebase';

export default function Reader() {
  const { id }       = useLocalSearchParams();
  const router       = useRouter();
  const navigation   = useNavigation();
  const { user }     = useAuth();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArticle(user.uid, id).then((a) => {
      setArticle(a);
      navigation.setOptions({ title: a?.domain || '' });
      setLoading(false);
    });
  }, [id, user.uid, navigation]);

  const toggle = async (field) => {
    const next = !article[field];
    setArticle((a) => ({ ...a, [field]: next }));
    await updateArticle(user.uid, id, { [field]: next });
  };

  const archive = async () => {
    await updateArticle(user.uid, id, { isArchived: true });
    router.back();
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color="#EF4056" size="large" />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>Article not found.</Text>
      </View>
    );
  }

  // Build the HTML payload injected into WebView.
  // The article content is already sanitised HTML from the cloud function.
  const html = `<!DOCTYPE html><html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, Georgia, serif;
    font-size: 18px; line-height: 1.75;
    background: #0A0A0F; color: #E2E8F0;
    padding: 20px 20px 60px;
  }
  h1,h2,h3 { color: #F1F5F9; margin: 1em 0 0.5em; line-height: 1.3; }
  p  { margin-bottom: 1em; }
  a  { color: #EF4056; }
  img { max-width: 100%; border-radius: 8px; margin: 1em 0; }
  pre,code { background: #13131A; border-radius: 6px; padding: 4px 8px;
             font-size: 14px; overflow-x: auto; }
  blockquote { border-left: 3px solid #EF4056; padding-left: 16px;
               color: #94A3B8; margin: 1em 0; }
</style>
</head>
<body>
  <h1 style="font-size:24px;margin-bottom:16px">${article.title || ''}</h1>
  ${article.content || `<p style="color:#94A3B8">Content not available. <a href="${article.url}">Read on the web →</a></p>`}
</body></html>`;

  const youtubeEmbedUrl = article.isVideo && article.videoId
    ? `https://www.youtube-nocookie.com/embed/${article.videoId}?rel=0&modestbranding=1&playsinline=1`
    : null;

  return (
    <SafeAreaView style={s.safe}>
      {/* Action bar */}
      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => toggle('isFavorite')}>
          <Heart size={20} color={article.isFavorite ? '#EF4056' : '#475569'}
                 fill={article.isFavorite ? '#EF4056' : 'none'} />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={archive}>
          <Archive size={20} color="#475569" />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn}
          onPress={() => WebBrowser.openBrowserAsync(article.url)}>
          <ExternalLink size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      {youtubeEmbedUrl ? (
        <WebView
          source={{ uri: youtubeEmbedUrl }}
          style={s.webview}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
        />
      ) : (
        <WebView
          source={{ html }}
          style={s.webview}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={(req) => {
            // Open all link taps in the external browser
            if (req.url !== 'about:blank' && !req.url.startsWith('data:')) {
              WebBrowser.openBrowserAsync(req.url);
              return false;
            }
            return true;
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#0A0A0F' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0F' },
  errorText: { color: '#94A3B8', fontSize: 15 },
  actions:   { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16,
               paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E293B', gap: 4 },
  actionBtn: { padding: 10, borderRadius: 8 },
  webview:   { flex: 1, backgroundColor: '#0A0A0F' },
});
