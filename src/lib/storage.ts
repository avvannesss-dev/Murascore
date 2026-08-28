import { createClient } from '@supabase/supabase-js';
import type {
  Game,
  Post,
  PostCategory,
  PostAttachment,
  StoredMessage,
  ProfileMap,
  Comment,
  GameComment,
  MusicTrack,
  MusicBand,
  MusicAlbum,
  Book,
  BookChapter,
  BlockedUser,
} from '../types';

// ============================================================
// Supabase client — initialized directly in this file
// ============================================================
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

// ============================================================
// Helpers
// ============================================================

export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const CURRENT_USER_KEY = 'murascore_current_user';

export function loadCurrentUser(): string | null {
  try {
    return localStorage.getItem(CURRENT_USER_KEY);
  } catch {
    return null;
  }
}

export function saveCurrentUser(nick: string | null): void {
  try {
    if (nick) localStorage.setItem(CURRENT_USER_KEY, nick);
    else localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
    /* ignore */
  }
}

// ============================================================
// Row types (internal)
// ============================================================

interface GameRow {
  id: string;
  name: string;
  cover_url: string;
  rating: number;
}

interface CommentRow {
  id: string;
  post_id: string;
  author: string;
  text: string;
  image_url: string | null;
  created_at: string;
}

interface ReactionRow {
  id: string;
  post_id: string;
  user_nick: string;
  type: 'rock' | 'popsa';
}

interface PostRow {
  id: string;
  title: string;
  body: string;
  category: string;
  author: string;
  game_id: string | null;
  is_pinned: boolean;
  rock_count: number;
  popsa_count: number;
  attachments: PostAttachment[] | null;
  created_at: string;
}

interface ProfileRow {
  nickname: string;
  following: string[];
  banner_url: string | null;
  avatar_url: string | null;
}

interface MessageRow {
  id: string;
  sender: string;
  recipient: string;
  body: string;
  created_at: string;
  read: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
}

interface GameCommentRow {
  id: string;
  game_id: string;
  author: string;
  text: string;
  image_url: string | null;
  is_guest: boolean;
  created_at: string;
}

interface MusicTrackRow {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  duration: number | null;
  album_id: string | null;
  order_index: number;
  created_at: string;
}

interface MusicBandRow {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  created_at: string;
}

interface MusicAlbumRow {
  id: string;
  band_id: string;
  title: string;
  cover_url: string | null;
  created_at: string;
}

interface BookRow {
  id: string;
  title: string;
  description: string;
  author: string;
  cover_url: string | null;
  created_at: string;
}

interface BookChapterRow {
  id: string;
  book_id: string;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
}

interface BlockedUserRow {
  id: string;
  blocker: string;
  blocked: string;
  created_at: string;
}

// ============================================================
// FILE UPLOAD (Supabase Storage)
// ============================================================

export async function uploadImage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) return null;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFile(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) return null;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================
// POSTS
// ============================================================

export async function getPosts(): Promise<Post[]> {
  const [
    { data: postRows, error: postErr },
    { data: commentRows, error: commentErr },
    { data: reactionRows, error: reactionErr },
  ] = await Promise.all([
    supabase.from('posts').select('*').order('created_at', { ascending: false }),
    supabase.from('comments').select('*').order('created_at', { ascending: true }),
    supabase.from('reactions').select('*'),
  ]);

  if (postErr || !postRows) return [];
  const comments = commentErr ? [] : (commentRows as CommentRow[]);
  const reactions = reactionErr ? [] : (reactionRows as ReactionRow[]);

  return (postRows as PostRow[]).map((p) => {
    const postComments: Comment[] = comments
      .filter((c) => c.post_id === p.id)
      .map((c) => ({
        id: c.id,
        author: c.author,
        text: c.text,
        createdAt: c.created_at,
        imageUrl: c.image_url || undefined,
      }));
    const rock = reactions
      .filter((r) => r.post_id === p.id && r.type === 'rock')
      .map((r) => r.user_nick);
    const popsa = reactions
      .filter((r) => r.post_id === p.id && r.type === 'popsa')
      .map((r) => r.user_nick);
    return {
      id: p.id,
      title: p.title,
      body: p.body,
      category: p.category as PostCategory,
      author: p.author,
      gameId: p.game_id,
      createdAt: p.created_at,
      rock,
      popsa,
      comments: postComments,
      isPinned: p.is_pinned,
      attachments: p.attachments ?? undefined,
    };
  });
}

export async function insertPost(post: {
  title: string;
  body: string;
  category: PostCategory;
  author: string;
  gameId: string | null;
  attachments?: PostAttachment[];
}): Promise<Post | null> {
  const { data: row, error } = await supabase
    .from('posts')
    .insert({
      title: post.title,
      body: post.body,
      category: post.category,
      author: post.author,
      game_id: post.gameId,
      is_pinned: false,
      rock_count: 0,
      popsa_count: 0,
      attachments: post.attachments && post.attachments.length > 0 ? post.attachments : [],
    })
    .select()
    .single();
  if (error || !row) return null;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category as PostCategory,
    author: row.author,
    gameId: row.game_id,
    createdAt: row.created_at,
    rock: [],
    popsa: [],
    comments: [],
    isPinned: false,
    attachments: post.attachments,
  };
}

// ============================================================
// REACTIONS
// ============================================================

export async function toggleReaction(
  postId: string,
  userNick: string,
  type: 'rock' | 'popsa',
): Promise<void> {
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_nick', userNick)
    .eq('type', type)
    .maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
  } else {
    await supabase
      .from('reactions')
      .insert({ post_id: postId, user_nick: userNick, type });
  }

  const { count: rockCount } = await supabase
    .from('reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('type', 'rock');
  const { count: popsaCount } = await supabase
    .from('reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('type', 'popsa');

  await updateReactions(postId, rockCount ?? 0, popsaCount ?? 0);
}

export async function updateReactions(
  postId: string,
  rockCount: number,
  popsaCount: number,
): Promise<void> {
  await supabase
    .from('posts')
    .update({ rock_count: rockCount, popsa_count: popsaCount })
    .eq('id', postId);
}

// ============================================================
// GAMES
// ============================================================

export async function getGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map((r: GameRow) => ({
    id: r.id,
    name: r.name,
    coverUrl: r.cover_url,
    rating: r.rating,
  }));
}

export async function insertGame(game: {
  name: string;
  coverUrl: string;
}): Promise<Game | null> {
  const rating = 7.0 + Math.random() * 2;
  const { data, error } = await supabase
    .from('games')
    .insert({ name: game.name, cover_url: game.coverUrl, rating })
    .select()
    .single();
  if (error || !data) return null;
  return { id: data.id, name: data.name, coverUrl: data.cover_url, rating: data.rating };
}

// ============================================================
// COMMENTS (posts)
// ============================================================

export async function getComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as CommentRow[]).map((c) => ({
    id: c.id,
    author: c.author,
    text: c.text,
    createdAt: c.created_at,
    imageUrl: c.image_url || undefined,
  }));
}

export async function insertComment(comment: {
  postId: string;
  author: string;
  text: string;
  imageUrl?: string;
}): Promise<Comment | null> {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: comment.postId,
      author: comment.author,
      text: comment.text,
      image_url: comment.imageUrl ?? '',
    })
    .select()
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    author: data.author,
    text: data.text,
    createdAt: data.created_at,
    imageUrl: data.image_url || undefined,
  };
}

// ============================================================
// GAME COMMENTS (game hub discussion)
// ============================================================

export async function getGameComments(gameId: string): Promise<GameComment[]> {
  const { data, error } = await supabase
    .from('game_comments')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as GameCommentRow[]).map((c) => ({
    id: c.id,
    author: c.author,
    text: c.text,
    createdAt: c.created_at,
    imageUrl: c.image_url || undefined,
    isGuest: c.is_guest,
  }));
}

export async function insertGameComment(comment: {
  gameId: string;
  author: string;
  text: string;
  imageUrl?: string;
  isGuest: boolean;
}): Promise<GameComment | null> {
  const { data, error } = await supabase
    .from('game_comments')
    .insert({
      game_id: comment.gameId,
      author: comment.author,
      text: comment.text,
      image_url: comment.imageUrl ?? null,
      is_guest: comment.isGuest,
    })
    .select()
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    author: data.author,
    text: data.text,
    createdAt: data.created_at,
    imageUrl: data.image_url || undefined,
    isGuest: data.is_guest,
  };
}

// ============================================================
// MESSAGES (DMs)
// ============================================================

export async function getMessages(sender: string, receiver: string): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender.eq.${sender},recipient.eq.${receiver}),and(sender.eq.${receiver},recipient.eq.${sender})`)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as MessageRow[]).map((r) => ({
    id: r.id,
    sender: r.sender,
    recipient: r.recipient,
    body: r.body,
    createdAt: r.created_at,
    read: r.read,
    attachmentUrl: r.attachment_url || undefined,
    attachmentName: r.attachment_name || undefined,
  }));
}

export async function getAllMessages(): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as MessageRow[]).map((r) => ({
    id: r.id,
    sender: r.sender,
    recipient: r.recipient,
    body: r.body,
    createdAt: r.created_at,
    read: r.read,
    attachmentUrl: r.attachment_url || undefined,
    attachmentName: r.attachment_name || undefined,
  }));
}

export async function insertMessage(msg: {
  sender: string;
  recipient: string;
  body: string;
  attachmentUrl?: string;
  attachmentName?: string;
}): Promise<StoredMessage | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender: msg.sender,
      recipient: msg.recipient,
      body: msg.body,
      attachment_url: msg.attachmentUrl ?? null,
      attachment_name: msg.attachmentName ?? null,
    })
    .select()
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    sender: data.sender,
    recipient: data.recipient,
    body: data.body,
    createdAt: data.created_at,
    read: data.read,
    attachmentUrl: data.attachment_url || undefined,
    attachmentName: data.attachment_name || undefined,
  };
}

export async function markMessagesRead(sender: string, recipient: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('sender', sender)
    .eq('recipient', recipient)
    .eq('read', false);
}

// ============================================================
// PROFILES & AUTH
// ============================================================

export async function getProfile(username: string): Promise<{
  nickname: string;
  salt: string;
  hash: string;
} | null> {
  const { data, error } = await supabase
    .from('users')
    .select('nickname, salt, hash')
    .eq('nickname', username)
    .maybeSingle();
  if (error || !data) return null;
  return data as { nickname: string; salt: string; hash: string };
}

export async function ensureProfile(
  username: string,
  passwordHash: string,
  salt: string,
): Promise<{ ok: boolean; error: string }> {
  const existing = await getProfile(username);
  if (existing) {
    return { ok: false, error: 'Этот никнейм уже занят' };
  }

  const { error: credErr } = await supabase
    .from('users')
    .insert({ nickname: username, salt, hash: passwordHash });
  if (credErr) {
    return { ok: false, error: 'Ошибка регистрации: ' + credErr.message };
  }

  await supabase.from('profiles').upsert({ nickname: username, following: [] });

  return { ok: true, error: '' };
}

export async function loadProfiles(): Promise<ProfileMap> {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error || !data) return {};
  const map: ProfileMap = {};
  for (const r of data as ProfileRow[]) {
    map[r.nickname] = {
      nickname: r.nickname,
      following: r.following ?? [],
      bannerUrl: r.banner_url || undefined,
      avatarUrl: r.avatar_url || undefined,
    };
  }
  return map;
}

export async function updateProfileFollowing(
  nickname: string,
  following: string[],
): Promise<void> {
  await supabase.from('profiles').upsert({ nickname, following });
}

export async function updateProfileBanner(
  nickname: string,
  bannerUrl: string,
): Promise<void> {
  await supabase.from('profiles').upsert({ nickname, banner_url: bannerUrl });
}

export async function updateProfileAvatar(
  nickname: string,
  avatarUrl: string,
): Promise<void> {
  await supabase.from('profiles').upsert({ nickname, avatar_url: avatarUrl });
}

// ============================================================
// MUSIC BANDS
// ============================================================

export async function getMusicBands(): Promise<MusicBand[]> {
  const { data, error } = await supabase
    .from('music_bands')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as MusicBandRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    avatarUrl: r.avatar_url || undefined,
  }));
}

export async function insertMusicBand(band: {
  name: string;
  description?: string;
  avatarUrl?: string;
}): Promise<MusicBand | null> {
  const { data, error } = await supabase
    .from('music_bands')
    .insert({
      name: band.name,
      description: band.description ?? '',
      avatar_url: band.avatarUrl ?? null,
    })
    .select()
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    avatarUrl: data.avatar_url || undefined,
  };
}

export async function deleteMusicBand(id: string): Promise<void> {
  await supabase.from('music_bands').delete().eq('id', id);
}

// ============================================================
// MUSIC ALBUMS
// ============================================================

export async function getAlbumsByBand(bandId: string): Promise<MusicAlbum[]> {
  const { data, error } = await supabase
    .from('music_albums')
    .select('*')
    .eq('band_id', bandId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as MusicAlbumRow[]).map((r) => ({
    id: r.id,
    bandId: r.band_id,
    title: r.title,
    coverUrl: r.cover_url || undefined,
  }));
}

export async function getAllAlbums(): Promise<MusicAlbum[]> {
  const { data, error } = await supabase
    .from('music_albums')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as MusicAlbumRow[]).map((r) => ({
    id: r.id,
    bandId: r.band_id,
    title: r.title,
    coverUrl: r.cover_url || undefined,
  }));
}

export async function insertMusicAlbum(album: {
  bandId: string;
  title: string;
  coverUrl?: string;
}): Promise<MusicAlbum | null> {
  const { data, error } = await supabase
    .from('music_albums')
    .insert({
      band_id: album.bandId,
      title: album.title,
      cover_url: album.coverUrl ?? null,
    })
    .select()
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    bandId: data.band_id,
    title: data.title,
    coverUrl: data.cover_url || undefined,
  };
}

export async function deleteMusicAlbum(id: string): Promise<void> {
  await supabase.from('music_albums').delete().eq('id', id);
}

// ============================================================
// MUSIC TRACKS
// ============================================================

export async function getTracksByAlbum(albumId: string): Promise<MusicTrack[]> {
  const { data, error } = await supabase
    .from('music_tracks')
    .select('*')
    .eq('album_id', albumId)
    .order('order_index', { ascending: true });
  if (error || !data) return [];
  return (data as MusicTrackRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    audioUrl: r.audio_url,
    duration: r.duration ?? undefined,
    albumId: r.album_id ?? undefined,
    orderIndex: r.order_index,
  }));
}

export async function getMusicTracks(): Promise<MusicTrack[]> {
  const { data, error } = await supabase
    .from('music_tracks')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as MusicTrackRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    audioUrl: r.audio_url,
    duration: r.duration ?? undefined,
    albumId: r.album_id ?? undefined,
    orderIndex: r.order_index,
  }));
}

export async function insertMusicTrack(track: {
  title: string;
  artist?: string;
  audioUrl: string;
  duration?: number;
  albumId?: string;
  orderIndex?: number;
}): Promise<MusicTrack | null> {
  const { data, error } = await supabase
    .from('music_tracks')
    .insert({
      title: track.title,
      artist: track.artist ?? 'УдОвОлЬсТвИе НоЧу',
      audio_url: track.audioUrl,
      duration: track.duration ?? null,
      album_id: track.albumId ?? null,
      order_index: track.orderIndex ?? 0,
    })
    .select()
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    artist: data.artist,
    audioUrl: data.audio_url,
    duration: data.duration ?? undefined,
    albumId: data.album_id ?? undefined,
    orderIndex: data.order_index,
  };
}

export async function deleteMusicTrack(id: string): Promise<void> {
  await supabase.from('music_tracks').delete().eq('id', id);
}

// ============================================================
// BOOKS
// ============================================================

export async function getBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as BookRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    author: r.author,
    coverUrl: r.cover_url || undefined,
  }));
}

export async function insertBook(book: {
  title: string;
  description?: string;
  author?: string;
}): Promise<Book | null> {
  const { data, error } = await supabase
    .from('books')
    .insert({
      title: book.title,
      description: book.description ?? '',
      author: book.author ?? 'Игорь Горь',
    })
    .select()
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    author: data.author,
    coverUrl: data.cover_url || undefined,
  };
}

export async function getBookChapters(bookId: string): Promise<BookChapter[]> {
  const { data, error } = await supabase
    .from('book_chapters')
    .select('*')
    .eq('book_id', bookId)
    .order('order_index', { ascending: true });
  if (error || !data) return [];
  return (data as BookChapterRow[]).map((r) => ({
    id: r.id,
    bookId: r.book_id,
    title: r.title,
    content: r.content,
    orderIndex: r.order_index,
  }));
}

export async function insertBookChapter(chapter: {
  bookId: string;
  title: string;
  content: string;
  orderIndex: number;
}): Promise<BookChapter | null> {
  const { data, error } = await supabase
    .from('book_chapters')
    .insert({
      book_id: chapter.bookId,
      title: chapter.title,
      content: chapter.content,
      order_index: chapter.orderIndex,
    })
    .select()
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    bookId: data.book_id,
    title: data.title,
    content: data.content,
    orderIndex: data.order_index,
  };
}

export async function deleteBook(id: string): Promise<void> {
  await supabase.from('books').delete().eq('id', id);
}

// ============================================================
// BLOCKED USERS (DM blacklist)
// ============================================================

export async function getBlockedUsers(blocker: string): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('*')
    .eq('blocker', blocker);
  if (error || !data) return [];
  return (data as BlockedUserRow[]).map((r) => ({
    id: r.id,
    blocker: r.blocker,
    blocked: r.blocked,
  }));
}

export async function blockUser(blocker: string, blocked: string): Promise<void> {
  await supabase.from('blocked_users').insert({ blocker, blocked });
}

export async function unblockUser(blocker: string, blocked: string): Promise<void> {
  await supabase.from('blocked_users').delete().eq('blocker', blocker).eq('blocked', blocked);
}

// ============================================================
// IMAGE COMPRESSION (client-side, for profile banners)
// ============================================================

export async function compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality,
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
