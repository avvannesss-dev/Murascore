import { useRef, useState } from 'react';
import type { Post, Game, Tab, PostCategory, PostAttachment } from '../types';
import { scanFileAsync } from '../lib/antivirus';
import { uploadFile } from '../lib/storage';
import { Captcha } from './Captcha';

interface Props {
  tab: Tab;
  posts: Post[];
  games: Game[];
  currentUser: string | null;
  isFollowing: (author: string) => boolean;
  onRock: (id: string) => void;
  onPopsa: (id: string) => void;
  onFollow: (author: string) => void;
  onComment: (postId: string, text: string, imageUrl?: string, guestName?: string) => void;
  onOpenDM: (peer: string) => void;
}

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

export function FeedTab({
  tab, posts, games, currentUser, isFollowing, onRock, onPopsa, onFollow, onComment, onOpenDM,
}: Props) {
  const category: PostCategory = tab === 'games' ? 'posts' : (tab as PostCategory);
  const filtered = posts.filter((p) => p.category === category);
  const pinned = filtered.filter((p) => p.isPinned);
  const regular = filtered.filter((p) => !p.isPinned);
  const ordered = [...pinned, ...regular];

  return (
    <div className="feed">
      {ordered.length === 0 && (
        <div className="feed__empty">НЕТ ПОСТОВ В ЭТОЙ КАТЕГОРИИ</div>
      )}
      {ordered.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          games={games}
          currentUser={currentUser}
          isFollowing={isFollowing}
          onRock={onRock}
          onPopsa={onPopsa}
          onFollow={onFollow}
          onComment={onComment}
          onOpenDM={onOpenDM}
        />
      ))}
    </div>
  );
}

function PostCard({
  post, games, currentUser, isFollowing, onRock, onPopsa, onFollow, onComment, onOpenDM,
}: {
  post: Post;
  games: Game[];
  currentUser: string | null;
  isFollowing: (a: string) => boolean;
  onRock: (id: string) => void;
  onPopsa: (id: string) => void;
  onFollow: (a: string) => void;
  onComment: (id: string, text: string, imageUrl?: string, guestName?: string) => void;
  onOpenDM: (p: string) => void;
}) {
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [uploadingComment, setUploadingComment] = useState(false);
  const [commentBlocked, setCommentBlocked] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const game = games.find((g) => g.id === post.gameId);

  const imageAttachments = (post.attachments ?? []).filter(isImageAttachment);
  const otherAttachments = (post.attachments ?? []).filter((a) => !isImageAttachment(a));

  async function handleCommentFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommentBlocked(null);
    if (file.size > 10 * 1024 * 1024) {
      setCommentBlocked('🚫 Файл больше 10MB');
      return;
    }
    const result = await scanFileAsync(file);
    if (!result.safe) {
      setCommentBlocked(`🚫 ${result.threat}`);
      return;
    }
    setUploadingComment(true);
    const url = await uploadFile(file);
    setUploadingComment(false);
    if (url) {
      setCommentImage(url);
    } else {
      setCommentBlocked('🚫 Ошибка загрузки файла');
    }
    if (commentFileRef.current) commentFileRef.current.value = '';
  }

  function handleSubmitComment() {
    if (!commentText.trim() && !commentImage) return;
    if (currentUser) {
      onComment(post.id, commentText.trim(), commentImage ?? undefined);
    } else {
      if (!guestName.trim() || !captchaVerified) return;
      onComment(post.id, commentText.trim(), commentImage ?? undefined, guestName.trim());
    }
    setCommentText('');
    setCommentImage(null);
    setCommentBlocked(null);
    setGuestName('');
    setCaptchaVerified(false);
  }

  const canSubmitComment = currentUser
    ? (commentText.trim() || commentImage) && !uploadingComment
    : (commentText.trim() || commentImage) && guestName.trim() && captchaVerified && !uploadingComment;

  return (
    <article className={`postcard ${post.isPinned ? 'postcard--pinned' : ''}`}>
      {post.isPinned && <div className="postcard__pin">📌 ЗАКРЕПЛЕНО</div>}
      <div className="postcard__header">
        <span className="postcard__author">{post.author}</span>
        <span className="postcard__date">{formatDate(post.createdAt)}</span>
        {game && <span className="postcard__game">🎮 {game.name}</span>}
      </div>
      <h3 className="postcard__title">{post.title}</h3>
      {post.body && <p className="postcard__body">{post.body}</p>}
      {imageAttachments.length > 0 && (
        <div className="postcard__images">
          {imageAttachments.map((a, i) => (
            <img
              key={i}
              src={a.url}
              alt={a.name}
              className="postcard__image"
              loading="lazy"
            />
          ))}
        </div>
      )}
      {otherAttachments.length > 0 && (
        <div className="postcard__attachments">
          {otherAttachments.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="postcard__attachment"
            >
              📎 {a.name}
            </a>
          ))}
        </div>
      )}
      <div className="postcard__actions">
        <button
          className="btn btn--rock"
          onClick={() => onRock(post.id)}
          disabled={!currentUser}
        >
          🤘 ROCK <span className="btn__count">{post.rock.length}</span>
        </button>
        <button
          className="btn btn--popsa"
          onClick={() => onPopsa(post.id)}
          disabled={!currentUser}
        >
          💩 ПОПСА <span className="btn__count">{post.popsa.length}</span>
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => setShowComments((s) => !s)}
        >
          💬 {post.comments.length}
        </button>
        {currentUser && post.author !== currentUser && (
          <>
            <button
              className="btn btn--ghost"
              onClick={() => onFollow(post.author)}
            >
              {isFollowing(post.author) ? 'ОТПИСКА' : 'ПОДПИСКА'}
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => onOpenDM(post.author)}
            >
              ✉
            </button>
          </>
        )}
      </div>
      {showComments && (
        <div className="postcard__comments">
          {post.comments.map((c) => (
            <div key={c.id} className="comment">
              <div className="comment__header">
                <span className="comment__author">{c.author}</span>
                <span className="comment__date">{formatDate(c.createdAt)}</span>
              </div>
              {c.text && <span className="comment__text">{c.text}</span>}
              {c.imageUrl && (
                <img
                  src={c.imageUrl}
                  alt="comment image"
                  className="comment__image"
                  loading="lazy"
                />
              )}
            </div>
          ))}
          <div className="comment__input-area">
            {commentImage && (
              <div className="comment__image-preview">
                <img src={commentImage} alt="preview" className="comment__image-preview-img" />
                <button
                  className="comment__image-remove"
                  onClick={() => setCommentImage(null)}
                >
                  ✕
                </button>
              </div>
            )}
            {commentBlocked && (
              <span className="composer__blocked">{commentBlocked}</span>
            )}
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
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment(); }}
              />
              <input
                ref={commentFileRef}
                type="file"
                className="comment__file-hidden"
                onChange={handleCommentFile}
              />
              <button
                className="btn btn--ghost"
                onClick={() => commentFileRef.current?.click()}
                disabled={uploadingComment}
                title="Прикрепить файл"
              >
                📎
              </button>
              <button
                className="btn btn--accent"
                onClick={handleSubmitComment}
                disabled={!canSubmitComment}
              >
                {uploadingComment ? '...' : '➤'}
              </button>
            </div>
            {!currentUser && (
              <Captcha onVerified={setCaptchaVerified} />
            )}
          </div>
        </div>
      )}
    </article>
  );
}
