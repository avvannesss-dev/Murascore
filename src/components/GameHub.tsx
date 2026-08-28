import { useEffect, useRef, useState } from 'react';
import type { Game, Post, PostAttachment, PostCategory, GameComment } from '../types';
import { Captcha } from './Captcha';
import { FileUploadZone } from './FileUploadZone';
import { getGameComments, insertGameComment, insertPost } from '../lib/storage';
import { scanFileAsync, formatBytes } from '../lib/antivirus';
import { uploadFile } from '../lib/storage';

interface Props {
  game: Game;
  posts: Post[];
  currentUser: string | null;
  onBack: () => void;
  onPostCreated: () => void;
}

type HubTab = 'overview' | 'posts' | 'discussion';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function isImageAttachment(a: PostAttachment): boolean {
  if (a.type.startsWith('image/')) return true;
  const ext = a.name.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}

export function GameHub({ game, posts, currentUser, onBack, onPostCreated }: Props) {
  const [hubTab, setHubTab] = useState<HubTab>('overview');
  const [gameComments, setGameComments] = useState<GameComment[]>([]);

  useEffect(() => {
    void (async () => {
      const c = await getGameComments(game.id);
      setGameComments(c);
    })();
  }, [game.id]);

  const gamePosts = posts.filter((p) => p.gameId === game.id);

  return (
    <div className="gamehub">
      <div className="gamehub__header">
        <button className="btn btn--ghost" onClick={onBack}>← НАЗАД</button>
        {game.coverUrl ? (
          <img className="gamehub__cover" src={game.coverUrl} alt={game.name} />
        ) : (
          <div className="gamehub__cover gamehub__cover--placeholder">
            <span className="gamecard__goat">🤘</span>
          </div>
        )}
        <div className="gamehub__info">
          <h2 className="gamehub__name">{game.name}</h2>
          <span className="gamehub__rating">★ {game.rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="gamehub__tabs">
        <button
          className={`gamehub__tab ${hubTab === 'overview' ? 'gamehub__tab--active' : ''}`}
          onClick={() => setHubTab('overview')}
        >Обзор</button>
        <button
          className={`gamehub__tab ${hubTab === 'posts' ? 'gamehub__tab--active' : ''}`}
          onClick={() => setHubTab('posts')}
        >Посты и файлы</button>
        <button
          className={`gamehub__tab ${hubTab === 'discussion' ? 'gamehub__tab--active' : ''}`}
          onClick={() => setHubTab('discussion')}
        >Обсуждение</button>
      </div>

      <div className="gamehub__content">
        {hubTab === 'overview' && (
          <div className="gamehub__overview">
            <p className="gamehub__desc">
              {game.name} — игровая страница на Murascore. Здесь геймеры делятся модами,
              читами, гайдами и обсуждают геймплей.
            </p>
            <div className="gamehub__stats">
              <span>📊 {gamePosts.length} постов</span>
              <span>💬 {gameComments.length} комментариев</span>
            </div>
          </div>
        )}

        {hubTab === 'posts' && (
          <div className="gamehub__posts">
            {currentUser && (
              <GamePostComposer gameId={game.id} currentUser={currentUser} onPublished={onPostCreated} />
            )}
            {!currentUser && <div className="composer composer--locked"><span className="composer__lock">🔒 ВОЙДИТЕ ЧТОБЫ ПИСАТЬ</span></div>}
            {gamePosts.length === 0 && <div className="feed__empty">НЕТ ПОСТОВ ДЛЯ ЭТОЙ ИГРЫ</div>}
            {gamePosts.map((post) => (
              <article key={post.id} className="postcard">
                <div className="postcard__header">
                  <span className="postcard__author">{post.author}</span>
                  <span className="postcard__date">{formatDate(post.createdAt)}</span>
                </div>
                <h3 className="postcard__title">{post.title}</h3>
                {post.body && <p className="postcard__body">{post.body}</p>}
                {(post.attachments ?? []).filter(isImageAttachment).length > 0 && (
                  <div className="postcard__images">
                    {(post.attachments ?? []).filter(isImageAttachment).map((a, i) => (
                      <img key={i} src={a.url} alt={a.name} className="postcard__image" loading="lazy" />
                    ))}
                  </div>
                )}
                {(post.attachments ?? []).filter((a) => !isImageAttachment(a)).length > 0 && (
                  <div className="postcard__attachments">
                    {(post.attachments ?? []).filter((a) => !isImageAttachment(a)).map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="postcard__attachment">📎 {a.name}</a>
                    ))}
                  </div>
                )}
                <div className="postcard__actions">
                  <span className="btn btn--rock" style={{ cursor: 'default' }}>🤘 ROCK <span className="btn__count">{post.rock.length}</span></span>
                  <span className="btn btn--popsa" style={{ cursor: 'default' }}>💩 ПОПСА <span className="btn__count">{post.popsa.length}</span></span>
                  <span className="btn btn--ghost" style={{ cursor: 'default' }}>💬 {post.comments.length}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        {hubTab === 'discussion' && (
          <GameDiscussion gameId={game.id} comments={gameComments} currentUser={currentUser} onCommentAdded={() => {
            void (async () => setGameComments(await getGameComments(game.id)))();
          }} />
        )}
      </div>
    </div>
  );
}

function GamePostComposer({ gameId, currentUser, onPublished }: {
  gameId: string;
  currentUser: string;
  onPublished: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);

  async function handlePublish() {
    if (!title.trim()) return;
    await insertPost({
      title: title.trim(),
      body: body.trim(),
      category: 'posts' as PostCategory,
      author: currentUser,
      gameId,
      attachments,
    });
    setTitle('');
    setBody('');
    setAttachments([]);
    onPublished();
  }

  return (
    <div className="composer">
      <input
        className="composer__title"
        type="text"
        placeholder="ЗАГОЛОВОК ПОСТА"
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="composer__body"
        placeholder="ТЕКСТ ПОСТА / ГАЙД / ЧИТ-КОД..."
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <FileUploadZone onFilesReady={setAttachments} />
      <button className="btn btn--accent" onClick={handlePublish} disabled={!title.trim()}>
        ОПУБЛИКОВАТЬ
      </button>
    </div>
  );
}

function GameDiscussion({ gameId, comments, currentUser, onCommentAdded }: {
  gameId: string;
  comments: GameComment[];
  currentUser: string | null;
  onCommentAdded: () => void;
}) {
  const [text, setText] = useState('');
  const [guestName, setGuestName] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [blocked, setBlocked] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBlocked(null);
    if (file.size > 10 * 1024 * 1024) { setBlocked('🚫 Файл больше 10MB'); return; }
    const result = await scanFileAsync(file);
    if (!result.safe) { setBlocked(`🚫 ${result.threat}`); return; }
    const url = await uploadFile(file);
    if (url) { setAttachment(url); setAttachmentName(file.name); }
    else { setBlocked('🚫 Ошибка загрузки'); }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit() {
    if (!text.trim() && !attachment) return;
    const author = currentUser ?? guestName.trim();
    if (!author) return;
    if (!currentUser && !captchaVerified) return;
    await insertGameComment({
      gameId,
      author,
      text: text.trim(),
      imageUrl: attachment ?? undefined,
      isGuest: !currentUser,
    });
    setText('');
    setGuestName('');
    setAttachment(null);
    setAttachmentName('');
    setCaptchaVerified(false);
    setBlocked(null);
    onCommentAdded();
  }

  const canSubmit = currentUser
    ? (text.trim() || attachment)
    : (text.trim() || attachment) && guestName.trim() && captchaVerified;

  return (
    <div className="gamedisc">
      <div className="gamedisc__list">
        {comments.length === 0 && <div className="feed__empty">НЕТ КОММЕНТАРИЕВ</div>}
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <div className="comment__header">
              <span className="comment__author">{c.author}{c.isGuest && <span className="comment__guest"> ГОСТЬ</span>}</span>
              <span className="comment__date">{formatDate(c.createdAt)}</span>
            </div>
            {c.text && <span className="comment__text">{c.text}</span>}
            {c.imageUrl && <img src={c.imageUrl} alt="attachment" className="comment__image" loading="lazy" />}
          </div>
        ))}
      </div>
      <div className="comment__input-area">
        {attachment && (
          <div className="comment__image-preview">
            <span className="composer__preview-file">📎 {attachmentName}</span>
            <button className="comment__image-remove" onClick={() => { setAttachment(null); setAttachmentName(''); }}>✕</button>
          </div>
        )}
        {blocked && <span className="composer__blocked">{blocked}</span>}
        {!currentUser && (
          <input
            className="comment__guest-name"
            type="text"
            placeholder="ВАШ НИК (без регистрации)"
            value={guestName}
            maxLength={30}
            onChange={(e) => setGuestName(e.target.value)}
          />
        )}
        <div className="comment__input-row">
          <input
            className="comment__input"
            type="text"
            placeholder="КОММЕНТАРИЙ..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
          <input ref={fileRef} type="file" className="comment__file-hidden" onChange={handleFile} />
          <button className="btn btn--ghost" onClick={() => fileRef.current?.click()} title="Прикрепить файл">📎</button>
          <button className="btn btn--accent" onClick={handleSubmit} disabled={!canSubmit}>➤</button>
        </div>
        {!currentUser && <Captcha onVerified={setCaptchaVerified} />}
      </div>
    </div>
  );
}
