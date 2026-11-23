import { useRef, useState } from 'react';

interface BadgeEditorProps {
  badges: string[];
  onChange: (badges: string[]) => void;
}

export function BadgeEditor({ badges, onChange }: BadgeEditorProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const parts = draft
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    const next = [...badges];
    for (const part of parts) {
      if (!next.some((badge) => badge.toLowerCase() === part.toLowerCase())) {
        next.push(part.slice(0, 60));
      }
    }
    onChange(next);
    setDraft('');
  };

  return (
    <div className="chips" onClick={() => inputRef.current?.focus()}>
      {badges.map((badge) => (
        <span className="chip" key={badge}>
          {badge}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange(badges.filter((item) => item !== badge));
            }}
            aria-label={`Quitar ${badge}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Backspace' && draft === '' && badges.length > 0) {
            event.preventDefault();
            onChange(badges.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={badges.length === 0 ? 'nombre, email, teléfono…' : ''}
        aria-label="Añadir etiqueta de coincidencia"
      />
    </div>
  );
}
