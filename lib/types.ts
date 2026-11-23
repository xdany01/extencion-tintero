export type ThemeMode = 'system' | 'light' | 'dark';

export interface Snippet {
  id: string;
  /** Título corto que se muestra en la lista. */
  title: string;
  /** Texto que se inserta en el campo. */
  text: string;
  /** Palabras o frases que se comparan con el contexto del campo. */
  badges: string[];
  uses: number;
  lastUsedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  active: boolean;
  theme: ThemeMode;
}

export const DEFAULT_SETTINGS: Settings = {
  active: true,
  theme: 'system',
};

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}
