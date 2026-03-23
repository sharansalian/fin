import { useState } from 'react';

export default function HighlighterSettings() {
  const [color, setColor] = useState(() => localStorage.getItem('pocket:highlighter:color') || '#fef08a');

  const colors = [
    { value: '#fef08a', label: 'Yellow' },
    { value: '#bbf7d0', label: 'Green' },
    { value: '#bfdbfe', label: 'Blue' },
    { value: '#fecaca', label: 'Pink' },
  ];

  const handleChange = (c) => {
    setColor(c);
    localStorage.setItem('pocket:highlighter:color', c);
  };

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        Choose your default highlight color:
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        {colors.map((c) => (
          <button
            key={c.value}
            onClick={() => handleChange(c.value)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: c.value,
              border: color === c.value ? '2px solid var(--accent-primary)' : '2px solid var(--border)',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease',
            }}
            title={c.label}
          />
        ))}
      </div>
    </div>
  );
}
