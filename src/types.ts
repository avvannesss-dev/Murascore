export type Tab = 'games' | 'posts' | 'mods' | 'forum' | 'humor' | 'cheats' | 'opinions' | 'music' | 'books';

export type PostCategory = 'posts' | 'mods' | 'forum' | 'humor' | 'cheats' | 'opinions';

export interface Game {
  id: string;
  name: string;
  coverUrl: string;
  rating: number;
}

export interface PostAttachment {
  name: string;
  url: string;
  type: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  imageUrl?: string;
}

export interface GameComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  imageUrl?: string;
  isGuest: boolean;
}

export interface Post {
  id: string;
  title: string;
  body: string;
  category: PostCategory;
  author: string;
  gameId: string | null;
  createdAt: string;
  rock: string[];
  popsa: string[];
  comments: Comment[];
  isPinned?: boolean;
  attachments?: PostAttachment[];
}

export interface Profile {
  nickname: string;
  following: string[];
  bannerUrl?: string;
  avatarUrl?: string;
}

export interface ProfileMap {
  [nickname: string]: Profile;
}

export interface StoredMessage {
  id: string;
  sender: string;
  recipient: string;
  body: string;
  createdAt: string;
  read?: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  duration?: number;
  albumId?: string;
  orderIndex?: number;
}

export interface MusicBand {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
}

export interface MusicAlbum {
  id: string;
  bandId: string;
  title: string;
  coverUrl?: string;
}

export interface Book {
  id: string;
  title: string;
  description: string;
  author: string;
  coverUrl?: string;
}

export interface BookChapter {
  id: string;
  bookId: string;
  title: string;
  content: string;
  orderIndex: number;
}

export interface BlockedUser {
  id: string;
  blocker: string;
  blocked: string;
}
