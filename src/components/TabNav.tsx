import type { Tab } from '../types';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'games', label: 'ВСЕ ИГРЫ' },
  { id: 'posts', label: 'ПОСТЫ' },
  { id: 'mods', label: 'МОДЫ' },
  { id: 'forum', label: 'ФОРУМ' },
  { id: 'humor', label: 'ЮМОР' },
  { id: 'cheats', label: 'ЧИТЫ' },
  { id: 'opinions', label: 'МНЕНИЯ' },
  { id: 'music', label: 'МУЗЫКА' },
  { id: 'books', label: 'КНИГИ' },
];

export function TabNav({ active, onChange }: Props) {
  return (
    <nav className="tabnav">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tabnav__btn ${active === t.id ? 'tabnav__btn--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
