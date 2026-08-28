import { useState } from 'react';
import type { Game, PostCategory, PostAttachment } from '../types';
import { FileUploadZone } from './FileUploadZone';

interface Props {
  games: Game[];
  currentUser: string | null;
  defaultCategory: PostCategory;
  onPublish: (data: {
    title: string;
    body: string;
    category: PostCategory;
    gameId: string | null;
    attachments: PostAttachment[];
  }) => void;
}

const CATEGORIES: { id: PostCategory; label: string }[] = [
  { id: 'posts', label: 'ПОСТ' },
  { id: 'mods', label: 'МОД' },
  { id: 'forum', label: 'ФОРУМ' },
  { id: 'humor', label: 'ЮМОР' },
  { id: 'cheats', label: 'ЧИТ' },
  { id: 'opinions', label: 'МНЕНИЕ' },
];

export function PostComposer({ games, currentUser, defaultCategory, onPublish }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<PostCategory>(defaultCategory);
  const [gameId, setGameId] = useState<string>('');
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);

  if (!currentUser) {
    return (
      <div className="composer composer--locked">
        <span className="composer__lock">🔒 ВОЙДИТЕ ЧТОБЫ ПИСАТЬ</span>
      </div>
    );
  }

  function handleFilesReady(files: PostAttachment[]) {
    setAttachments(files);
  }

  function handlePublish() {
    if (!title.trim()) return;
    onPublish({
      title: title.trim(),
      body: body.trim(),
      category,
      gameId: gameId || null,
      attachments,
    });
    setTitle('');
    setBody('');
    setGameId('');
    setAttachments([]);
  }

  return (
    <div className="composer">
      <div className="composer__row">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`composer__cat ${category === c.id ? 'composer__cat--active' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <input
        className="composer__title"
        type="text"
        placeholder="ЗАГОЛОВОК ПОСТА (пишите название игры вручную если её нет в базе)"
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="composer__body"
        placeholder="ТЕКСТ ПОСТА..."
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <FileUploadZone onFilesReady={handleFilesReady} />
      <div className="composer__row composer__row--bottom">
        <select
          className="composer__select"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
        >
          <option value="">— ИГРА —</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <button className="btn btn--accent" onClick={handlePublish} disabled={!title.trim()}>
          ОПУБЛИКОВАТЬ
        </button>
      </div>
    </div>
  );
}
