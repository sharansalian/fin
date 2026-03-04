import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Heart, HeartOff, Archive, RotateCcw,
  ExternalLink, Loader, AlertCircle, Minus, Plus, Type,
  RefreshCw, Headphones, Pause, StopCircle, ChevronDown, Check,
  Sparkles, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { getArticle, updateArticle } from '../firebase/articles';
import { fetchAndParse, summarizeArticle, readArticleAloud, isSocialUrl } from '../utils/articleFetcher';
import { useHighlights, HighlightsPanel } from '../components/HighlightToolbar';
import TagEditor from '../components/TagEditor';
import VideoPlayer from '../components/VideoPlayer';
import styles from './Reader.module.css';

const FONT_SIZES = ['small', 'medium', 'large'];

const FONT_FAMILIES = [
  { name: 'Lora',         value: "'Lora', Georgia, serif" },
  { name: 'Georgia',      value: "Georgia, 'Times New Roman', serif" },
  { name: 'Merriweather', value: "'Merriweather', Georgia, serif" },
  { name: 'Inter',        value: "'Inter', system-ui, sans-serif" },
  { name: 'Google Sans',  value: "'Google Sans', 'Nunito Sans', system-ui, sans-serif" },
];

// Score a voice — higher = more human-sounding
const scoreVoice = (v) => {
  const n = v.name.toLowerCase();
  if (n.includes('wavenet')) return 100;   // Google WaveNet (Chrome) — neural
  if (n.includes('neural'))  return 95;    // Microsoft Neural (Edge) — neural
  if (n.includes('aria'))    return 90;    // Microsoft Aria — very natural
  if (n.includes('jenny'))   return 88;    // Microsoft Jenny
  if (n.includes('siri'))    return 85;    // Apple Siri voices
  if (n.includes('enhanced')) return 80;   // Apple Enhanced (macOS/iOS)
  if (n.includes('premium')) return 75;
  if (n.includes('samantha')) return 70;   // macOS Samantha — good quality
  if (n.includes('alex'))    return 65;    // macOS Alex
  if (v.localService)        return 30;    // Any local voice
  return 10;
};

const getEnglishVoices = () => {
  const all = window.speechSynthesis?.getVoices() ?? [];
  return all
    .filter((v) => v.lang.startsWith('en'))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
};

export default function Reader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = usePremium();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [fontSizeIdx, setFontSizeIdx] = useState(1);
  const [fontFamilyIdx, setFontFamilyIdx] = useState(
    () => parseInt(localStorage.getItem('reader-font') || '0', 10)
  );
  const [showFontPicker, setShowFontPicker] = useState(false);
  const fontPickerRef = useRef(null);
  const contentRef = useRef(null);

  // Highlights (premium)
  const {
    highlights, toolbar: highlightToolbar, notePopover,
    handleMouseUp, removeHighlight,
  } = useHighlights({ articleId: id, contentRef, isPremium });

  // AI Summary
  const [aiSummary, setAiSummary] = useState(null);    // null = not loaded yet
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showSummary, setShowSummary] = useState(true); // collapsed state

  // TTS
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(
    () => localStorage.getItem('tts-voice') || ''
  );
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const uttRef = useRef(null);
  const voicePickerRef = useRef(null);

  // Kokoro AI TTS
  const [kokoroLoading, setKokoroLoading] = useState(false);
  const kokoroAudioRef = useRef(null);       // current Audio element
  const kokoroChunksRef = useRef([]);         // array of Blob objects
  const kokoroChunkIdxRef = useRef(0);        // which chunk is playing

  // Load voices (Chrome loads them async; iOS/macOS loads sync)
  useEffect(() => {
    const load = () => {
      const v = getEnglishVoices();
      if (v.length === 0) return;
      setVoices(v);
      // Pick best voice automatically if none saved yet
      if (!localStorage.getItem('tts-voice') && v[0]) {
        setSelectedVoiceURI(v[0].voiceURI);
        localStorage.setItem('tts-voice', v[0].voiceURI);
      }
    };
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  // Close voice picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (voicePickerRef.current && !voicePickerRef.current.contains(e.target)) {
        setShowVoicePicker(false);
      }
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target)) {
        setShowFontPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load article
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getArticle(user.uid, id);
        if (!data) { setError('Article not found.'); setLoading(false); return; }
        if (mounted) setArticle(data);

        if (!data.isRead) {
          updateArticle(user.uid, id, { isRead: true, readAt: new Date().toISOString() });
        }

        if (data.fetchStatus !== 'fetched' && data.url && !isSocialUrl(data.url)) {
          if (mounted) setFetching(true);
          try {
            const parsed = await fetchAndParse(data.url);
            await updateArticle(user.uid, id, parsed);
            if (mounted) setArticle((prev) => ({ ...prev, ...parsed }));
          } catch (err) {
            console.error('[Reader] fetchAndParse failed:', err?.message, err);
            const update = { fetchStatus: 'failed', fetchError: err?.message || 'unknown' };
            await updateArticle(user.uid, id, update);
            if (mounted) setArticle((prev) => ({ ...prev, ...update }));
          } finally {
            if (mounted) setFetching(false);
          }
        }
      } catch {
        if (mounted) setError('Failed to load article.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; window.speechSynthesis?.cancel(); kokoroAudioRef.current?.pause(); };
  }, [id, user.uid]);

  const act = async (data) => {
    setArticle((prev) => ({ ...prev, ...data }));
    await updateArticle(user.uid, id, data);
  };

  const handleTagsChange = async (newTags) => {
    setArticle((prev) => ({ ...prev, tags: newTags }));
    await updateArticle(user.uid, id, { tags: newTags });
  };

  const retryFetch = async () => {
    if (!article?.url) return;
    setFetching(true);
    setArticle((prev) => ({ ...prev, fetchStatus: 'pending' }));
    try {
      const parsed = await fetchAndParse(article.url);
      await updateArticle(user.uid, id, parsed);
      setArticle((prev) => ({ ...prev, ...parsed }));
    } catch (err) {
      console.error('[Reader] retryFetch failed:', err?.message, err);
      const update = { fetchStatus: 'failed', fetchError: err?.message || 'unknown' };
      await updateArticle(user.uid, id, update);
      setArticle((prev) => ({ ...prev, ...update }));
    } finally {
      setFetching(false);
    }
  };

  // When the article loads, surface any previously-cached AI summary
  useEffect(() => {
    if (article?.aiSummary) {
      setAiSummary({
        summary:       article.aiSummary,
        keyPoints:     article.aiKeyPoints     || [],
        suggestedTags: article.aiSuggestedTags || [],
      });
    }
  }, [article?.id]); // eslint-disable-line

  const handleSummarize = async () => {
    if (!isPremium) { navigate('/premium'); return; }
    if (!article?.content) return;
    setAiLoading(true);
    setAiError('');
    try {
      // Calls the LangGraph Cloud Function.
      // The graph runs: assess → (conditional) → summarize → END
      const result = await summarizeArticle({
        content:   article.content,
        title:     article.title || '',
        articleId: id,
      });
      if (result.skipped) {
        setAiError('Article is too short to summarize.');
      } else {
        setAiSummary(result);
        setShowSummary(true);
      }
    } catch (err) {
      const detail = err?.message || err?.code || '';
      setAiError(`Summarization failed${detail ? ` — ${detail}` : ' — check that GROQ_API_KEY secret is set.'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const getPlainText = () => {
    if (!article?.content) return article?.excerpt || '';
    const div = document.createElement('div');
    div.innerHTML = article.content;
    return div.textContent || div.innerText || '';
  };

  // ── Kokoro AI playback ─────────────────────────────────────────────────
  const playNextKokoroChunk = useCallback(() => {
    const idx = kokoroChunkIdxRef.current;
    const chunks = kokoroChunksRef.current;

    if (idx >= chunks.length) {
      setSpeaking(false);
      setPaused(false);
      return;
    }

    const url = URL.createObjectURL(chunks[idx]);
    const audio = new Audio(url);
    kokoroAudioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      kokoroChunkIdxRef.current++;
      playNextKokoroChunk();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      setSpeaking(false);
      setPaused(false);
    };

    audio.play().catch(() => {
      URL.revokeObjectURL(url);
      setSpeaking(false);
      setPaused(false);
    });
  }, []);

  const startKokoro = useCallback(async () => {
    if (!article) return;
    setKokoroLoading(true);
    try {
      const result = await readArticleAloud({
        content: article.content || article.excerpt || '',
        title:   article.title   || '',
      });

      if (result.skipped) {
        setKokoroLoading(false);
        return;
      }

      // Decode base64 chunks into Blobs
      kokoroChunksRef.current = result.audioChunks.map((base64) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: result.contentType || 'audio/flac' });
      });
      kokoroChunkIdxRef.current = 0;

      setKokoroLoading(false);
      setSpeaking(true);
      setPaused(false);
      playNextKokoroChunk();
    } catch (err) {
      console.error('[Reader] Kokoro TTS failed:', err);
      setKokoroLoading(false);
    }
  }, [article, playNextKokoroChunk]);

  const stopKokoro = useCallback(() => {
    kokoroAudioRef.current?.pause();
    kokoroAudioRef.current = null;
    kokoroChunksRef.current = [];
    kokoroChunkIdxRef.current = 0;
    setSpeaking(false);
    setPaused(false);
  }, []);

  // ── Browser SpeechSynthesis ───────────────────────────────────────────────
  const startSpeaking = useCallback((voiceURI) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const text = `${article.title}. ${getPlainText()}`;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92;
    utt.pitch = 1.0;

    const voice = voices.find((v) => v.voiceURI === (voiceURI || selectedVoiceURI)) || voices[0];
    if (voice) utt.voice = voice;

    utt.onend = () => { setSpeaking(false); setPaused(false); };
    utt.onerror = () => { setSpeaking(false); setPaused(false); };
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
    setSpeaking(true);
    setPaused(false);
  }, [article, voices, selectedVoiceURI]); // eslint-disable-line

  const isKokoro = selectedVoiceURI === 'kokoro';

  const handleListen = () => {
    if (isKokoro) {
      if (!isPremium) { navigate('/premium'); return; }
      if (speaking && !paused) { kokoroAudioRef.current?.pause(); setPaused(true); return; }
      if (paused) { kokoroAudioRef.current?.play(); setPaused(false); return; }
      startKokoro();
      return;
    }
    if (!window.speechSynthesis) return;
    if (speaking && !paused) { window.speechSynthesis.pause(); setPaused(true); return; }
    if (paused) { window.speechSynthesis.resume(); setPaused(false); return; }
    startSpeaking();
  };

  const handleStopListen = () => {
    if (isKokoro) { stopKokoro(); return; }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  const selectVoice = (voiceURI) => {
    // Stop whichever mode is currently playing
    if (speaking) {
      if (isKokoro) stopKokoro();
      else { window.speechSynthesis?.cancel(); setSpeaking(false); setPaused(false); }
    }
    setSelectedVoiceURI(voiceURI);
    localStorage.setItem('tts-voice', voiceURI);
    setShowVoicePicker(false);
  };

  if (loading) {
    return (
      <div className={styles.loadingFull}>
        <Loader size={32} className={styles.spin} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorFull}>
        <AlertCircle size={40} />
        <p>{error}</p>
        <button className="btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const isVideo = !!article.isVideo;
  const isSocial = isSocialUrl(article.url);
  const fontSize = FONT_SIZES[fontSizeIdx];
  const selectedVoice = voices.find((v) => v.voiceURI === selectedVoiceURI) || voices[0];
  const hasTTS = !isVideo;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={`btn-ghost ${styles.backBtn}`} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>

        <div className={styles.topActions}>
          {!isVideo && (
            <div className={styles.fontControls}>
              <Type size={14} className={styles.fontIcon} />
              <button className={styles.iconBtn} onClick={() => setFontSizeIdx((i) => Math.max(0, i - 1))} disabled={fontSizeIdx === 0}>
                <Minus size={14} />
              </button>
              <button className={styles.iconBtn} onClick={() => setFontSizeIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))} disabled={fontSizeIdx === FONT_SIZES.length - 1}>
                <Plus size={14} />
              </button>
              <div className={styles.fontFamilyGroup} ref={fontPickerRef}>
                <button
                  className={`${styles.fontFamilyBtn} ${showFontPicker ? styles.active : ''}`}
                  onClick={() => setShowFontPicker((o) => !o)}
                  title="Choose font"
                >
                  Aa
                </button>
                {showFontPicker && (
                  <div className={styles.fontPicker}>
                    <p className={styles.fontPickerTitle}>Font</p>
                    <div className={styles.fontList}>
                      {FONT_FAMILIES.map((f, idx) => (
                        <button
                          key={f.name}
                          className={`${styles.fontItem} ${idx === fontFamilyIdx ? styles.fontSelected : ''}`}
                          style={{ fontFamily: f.value }}
                          onClick={() => {
                            setFontFamilyIdx(idx);
                            localStorage.setItem('reader-font', String(idx));
                            setShowFontPicker(false);
                          }}
                        >
                          <span className={styles.fontItemName}>{f.name}</span>
                          {idx === fontFamilyIdx && <Check size={13} className={styles.fontCheck} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {hasTTS && (
            <div className={styles.listenGroup} ref={voicePickerRef}>
              {/* Headphones — play/pause */}
              <button
                className={`${styles.iconBtn} ${speaking ? styles.active : ''}`}
                onClick={handleListen}
                disabled={kokoroLoading}
                title={kokoroLoading ? 'Generating audio...' : speaking && !paused ? 'Pause' : paused ? 'Resume' : 'Listen'}
              >
                {kokoroLoading ? <Loader size={16} className={styles.spin} /> : speaking && !paused ? <Pause size={16} /> : <Headphones size={16} />}
              </button>

              {/* Stop button — only while speaking */}
              {speaking && (
                <button className={styles.iconBtn} onClick={handleStopListen} title="Stop">
                  <StopCircle size={16} />
                </button>
              )}

              {/* Voice selector toggle */}
              {!speaking && (
                <button
                  className={`${styles.voicePickerBtn} ${showVoicePicker ? styles.active : ''}`}
                  onClick={() => setShowVoicePicker((o) => !o)}
                  title="Choose voice"
                >
                  <ChevronDown size={12} />
                </button>
              )}

              {/* Voice picker dropdown */}
              {showVoicePicker && (
                <div className={styles.voicePicker}>
                  <p className={styles.voicePickerTitle}>Choose voice</p>
                  <div className={styles.voiceList}>
                    {/* Kokoro AI — cloud-powered TTS (premium only) */}
                    <button
                      className={`${styles.voiceItem} ${selectedVoiceURI === 'kokoro' ? styles.voiceSelected : ''}`}
                      onClick={() => isPremium ? selectVoice('kokoro') : navigate('/premium')}
                    >
                      <span className={styles.voiceName}>Kokoro AI</span>
                      <span className={styles.voiceTagAi}>{isPremium ? 'AI' : 'Premium'}</span>
                      {selectedVoiceURI === 'kokoro' && isPremium && <Check size={13} className={styles.voiceCheck} />}
                    </button>

                    {/* Browser voices */}
                    {voices.slice(0, 12).map((v) => (
                      <button
                        key={v.voiceURI}
                        className={`${styles.voiceItem} ${v.voiceURI === selectedVoiceURI ? styles.voiceSelected : ''}`}
                        onClick={() => selectVoice(v.voiceURI)}
                      >
                        <span className={styles.voiceName}>{v.name.replace(/\s*\(.*?\)\s*/g, '')}</span>
                        {scoreVoice(v) >= 80 && <span className={styles.voiceTag}>Neural</span>}
                        {v.voiceURI === selectedVoiceURI && <Check size={13} className={styles.voiceCheck} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Summarize — only for fetched articles with content */}
          {!isVideo && article.fetchStatus === 'fetched' && article.content && (
            <button
              className={`${styles.iconBtn} ${aiSummary ? styles.active : ''}`}
              onClick={aiSummary ? () => setShowSummary((s) => !s) : handleSummarize}
              disabled={aiLoading}
              title={aiSummary ? (showSummary ? 'Hide summary' : 'Show summary') : isPremium ? 'AI Summary' : 'AI Summary (Premium)'}
            >
              {aiLoading ? <Loader size={16} className={styles.spin} /> : <Sparkles size={16} />}
            </button>
          )}

          <a href={article.url} target="_blank" rel="noopener noreferrer" className={styles.iconBtn} title="Open original">
            <ExternalLink size={16} />
          </a>

          <button
            className={`${styles.iconBtn} ${article.isFavorite ? styles.active : ''}`}
            onClick={() => act({ isFavorite: !article.isFavorite })}
          >
            {article.isFavorite ? <HeartOff size={16} /> : <Heart size={16} />}
          </button>

          <button className={styles.iconBtn} onClick={() => act({ isArchived: !article.isArchived })}>
            {article.isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
          </button>
        </div>
      </header>

      {/* Listening banner */}
      {kokoroLoading && (
        <div className={styles.listeningBar}>
          <Loader size={14} className={styles.spin} />
          Generating audio with Kokoro AI...
        </div>
      )}
      {speaking && (
        <div className={styles.listeningBar}>
          <Headphones size={14} />
          {paused ? 'Paused' : 'Listening'} · {isKokoro ? 'Kokoro AI' : (selectedVoice?.name?.replace(/\s*\(.*?\)\s*/g, '') || 'Browser')}
        </div>
      )}

      {/* Highlight toolbar / note popover (premium) */}
      {highlightToolbar}
      {notePopover}

      <article
        className={`${styles.article} ${styles[fontSize]}`}
        style={{ '--font-reader': FONT_FAMILIES[fontFamilyIdx].value }}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        {article.heroImage && (
          <img src={article.heroImage} alt="" className={styles.heroImage} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}

        <div className={styles.articleMeta}>
          {article.domain && <span className={styles.metaDomain}>{article.domain}</span>}
          {article.estimatedReadTime > 0 && <span className={styles.metaReadTime}>{article.estimatedReadTime} min read</span>}
        </div>

        <h1 className={styles.articleTitle}>{article.title}</h1>
        {article.authors?.length > 0 && <p className={styles.byline}>By {article.authors.join(', ')}</p>}

        <div className={styles.readerTags}>
          <TagEditor tags={article.tags || []} onChange={handleTagsChange} compact />
        </div>

        <div className={styles.divider} />

        {/* ── AI Summary panel ────────────────────────────────────────────── */}
        {aiError && (
          <p className={styles.aiError}>{aiError}</p>
        )}
        {aiSummary && showSummary && (
          <div className={styles.aiPanel}>
            <div className={styles.aiPanelHeader}>
              <span className={styles.aiPanelTitle}>
                <Sparkles size={14} /> AI Summary
              </span>
              <button className={styles.aiCollapseBtn} onClick={() => setShowSummary(false)}>
                <ChevronUp size={14} />
              </button>
            </div>
            <p className={styles.aiSummaryText}>{aiSummary.summary}</p>
            {aiSummary.keyPoints?.length > 0 && (
              <ul className={styles.aiKeyPoints}>
                {aiSummary.keyPoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            )}
            {aiSummary.suggestedTags?.length > 0 && (
              <div className={styles.aiTags}>
                {aiSummary.suggestedTags.map((tag) => (
                  <span key={tag} className={styles.aiTag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
        {/* ──────────────────────────────────────────────────────────────── */}

        {/* ── Highlights panel (premium) ──────────────────────────────────── */}
        {isPremium && highlights.length > 0 && (
          <HighlightsPanel highlights={highlights} onDelete={removeHighlight} />
        )}
        {/* ──────────────────────────────────────────────────────────────── */}

        {isSocial ? (
          <div className={styles.fetchFailed}>
            <ExternalLink size={20} />
            <p>
              This is a <strong>{article.domain}</strong> link — the content can't be shown inside Pocket.
            </p>
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Open on {article.domain}
            </a>
          </div>
        ) : isVideo ? (
          <VideoPlayer videoId={article.videoId} transcript={article.transcript ?? []} />
        ) : (
          <>
            {fetching && (
              <div className={styles.fetchingMsg}>
                <Loader size={16} className={styles.spin} />
                Loading article content…
              </div>
            )}

            {article.fetchStatus === 'fetched' && article.content ? (
              <div ref={contentRef} className={styles.content} dangerouslySetInnerHTML={{ __html: article.content }} />
            ) : article.fetchStatus === 'failed' ? (
              <div className={styles.fetchFailed}>
                <AlertCircle size={20} />
                <p>Could not load the article content.</p>
                {article.fetchError && (
                  <p style={{ fontSize: '12px', opacity: 0.6, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {article.fetchError}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" onClick={retryFetch} disabled={fetching}>
                    <RefreshCw size={14} /> Retry
                  </button>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                    Read on original site
                  </a>
                </div>
              </div>
            ) : !fetching ? (
              <div className={styles.fetchFailed}>
                <p className={styles.excerpt}>{article.excerpt}</p>
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  Open original article
                </a>
              </div>
            ) : null}
          </>
        )}
      </article>
    </div>
  );
}
