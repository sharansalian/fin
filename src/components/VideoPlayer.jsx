import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './VideoPlayer.module.css';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function VideoPlayer({ videoId, transcript = [] }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const iframeRef = useRef(null);

  // youtube-nocookie.com avoids third-party cookies; enablejsapi=1 allows postMessage seeks
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;

  const seekTo = (startSeconds) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [startSeconds, true] }),
      'https://www.youtube-nocookie.com',
    );
  };

  return (
    <div className={styles.wrapper}>
      {/* 16:9 responsive iframe */}
      <div className={styles.playerWrap}>
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className={styles.player}
        />
      </div>

      {/* Transcript panel */}
      {transcript.length > 0 ? (
        <div className={styles.transcriptBox}>
          <button
            className={styles.transcriptToggle}
            onClick={() => setShowTranscript((v) => !v)}
          >
            <span className={styles.toggleLabel}>Transcript</span>
            <span className={styles.toggleCount}>{transcript.length} segments</span>
            {showTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showTranscript && (
            <div className={styles.segmentList}>
              {transcript.map((seg, i) => (
                <button
                  key={i}
                  className={styles.segment}
                  onClick={() => seekTo(seg.start)}
                  title={`Jump to ${formatTime(seg.start)}`}
                >
                  <span className={styles.timestamp}>{formatTime(seg.start)}</span>
                  <span className={styles.segText}>{seg.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className={styles.noTranscript}>No transcript available for this video.</p>
      )}
    </div>
  );
}
