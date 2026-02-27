import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { loginWithGoogle } from '@pocket/core/firebase';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      // AuthGuard in _layout.jsx will redirect to (tabs) automatically
    } catch (e) {
      setError(e?.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoBox}>
            <Text style={s.logoMark}>P</Text>
          </View>
        </View>

        <Text style={s.title}>Pocket</Text>
        <Text style={s.subtitle}>Save anything. Read it later.</Text>

        <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.googleBtnText}>Continue with Google</Text>
          }
        </TouchableOpacity>

        {error ? <Text style={s.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#0A0A0F' },
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoWrap:     { marginBottom: 20 },
  logoBox:      { width: 64, height: 64, borderRadius: 18, backgroundColor: '#EF4056',
                  alignItems: 'center', justifyContent: 'center' },
  logoMark:     { color: '#fff', fontSize: 30, fontWeight: '800' },
  title:        { fontSize: 32, fontWeight: '800', color: '#F1F5F9', marginBottom: 8 },
  subtitle:     { fontSize: 16, color: '#94A3B8', marginBottom: 48, textAlign: 'center' },
  googleBtn:    { width: '100%', backgroundColor: '#EF4056', borderRadius: 12,
                  paddingVertical: 16, alignItems: 'center' },
  googleBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
  error:        { marginTop: 16, color: '#EF4444', fontSize: 14, textAlign: 'center' },
});
