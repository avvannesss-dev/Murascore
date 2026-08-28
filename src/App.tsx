import { useCallback, useEffect, useState } from 'react';
import { AddGameModal } from './components/AddGameModal';
import { DMPanel } from './components/DMPanel';
import { FeedTab } from './components/FeedTab';
import { GameHub } from './components/GameHub';
import { GamesTab } from './components/GamesTab';
import { LoginBar } from './components/LoginBar';
import { MusicTab } from './components/MusicTab';
import { BooksTab } from './components/BooksTab';
import { PostComposer } from './components/PostComposer';
import { MobileNav } from './components/MobileNav';
import { TabNav } from './components/TabNav';
import { UserProfile } from './components/UserProfile';
import { loginAccount, registerAccount } from './lib/auth';
import { supabase } from './lib/storage';
import {
  getAllMessages,
  getGames,
  getPosts,
  insertComment,
  insertGame,
  insertMessage,
  insertPost,
  loadCurrentUser,
  loadProfiles,
  saveCurrentUser,
  toggleReaction,
  updateProfileFollowing,
} from './lib/storage';
import type { Game, Post, PostAttachment, PostCategory, StoredMessage, Tab } from './types';

function parseHash(): { route: string; gameId: string | null } {
  const hash = window.location.hash.slice(1);
  const match = hash.match(/^\/games\/(.+)$/);
  if (match) return { route: 'game', gameId: match[1] };
  if (hash === '/profile') return { route: 'profile', gameId: null };
  return { route: 'feed', gameId: null };
}

function App() {
  const [tab, setTab] = useState<Tab>('games');
  const [games, setGames] = useState<Game[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(() => loadCurrentUser());
  const [profiles, setProfiles] = useState<Record<string, { nickname: string; following: string[]; bannerUrl?: string; avatarUrl?: string }>>({});
  const [gameSearch, setGameSearch] = useState('');
  const [showAddGame, setShowAddGame] = useState(false);
  const [showDM, setShowDM] = useState(false);
  const [dmPeer, setDmPeer] = useState<string | null>(null);
  const [hashRoute, setHashRoute] = useState(parseHash());

  // ---- Hash routing ----
  useEffect(() => {
    const onHash = () => setHashRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // ---- Initial load from Supabase (global feed) ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [g, p, m, pr] = await Promise.all([
        getGames(),
        getPosts(),
        getAllMessages(),
        loadProfiles(),
      ]);
      if (cancelled) return;
      setGames(g);
      setPosts(p);
      setMessages(m);
      setProfiles(pr);
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- Realtime: live-sync posts, comments, reactions, games, messages, profiles ----
  useEffect(() => {
    const channel = supabase
      .channel('murascore-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => { void refreshPosts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => { void refreshPosts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => { void refreshPosts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => { void refreshGames(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void refreshMessages(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { void refreshProfiles(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_comments' }, () => { void refreshPosts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_tracks' }, () => {})
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshPosts() { setPosts(await getPosts()); }
  async function refreshGames() { setGames(await getGames()); }
  async function refreshMessages() { setMessages(await getAllMessages()); }
  async function refreshProfiles() { setProfiles(await loadProfiles()); }

  const profile = currentUser ? (profiles[currentUser] ?? { nickname: currentUser, following: [] }) : null;

  const isFollowing = useCallback(
    (author: string) => (profile?.following.includes(author) ?? false),
    [profile],
  );

  async function handleRegister(nickname: string, password: string): Promise<string | null> {
    const result = await registerAccount(nickname, password);
    if (!result.ok) return result.error;
    saveCurrentUser(result.nickname);
    setCurrentUser(result.nickname);
    setProfiles(await loadProfiles());
    return null;
  }

  async function handleLogin(nickname: string, password: string): Promise<string | null> {
    const result = await loginAccount(nickname, password);
    if (!result.ok) return result.error;
    saveCurrentUser(result.nickname);
    setCurrentUser(result.nickname);
    setProfiles(await loadProfiles());
    return null;
  }

  function handleLogout() {
    saveCurrentUser(null);
    setCurrentUser(null);
    window.location.hash = '';
  }

  async function handleAddGame(name: string, coverUrl: string) {
    const game = await insertGame({ name, coverUrl });
    if (game) setGames((prev) => [...prev, game]);
  }

  async function handlePublish(data: {
    title: string;
    body: string;
    category: PostCategory;
    gameId: string | null;
    attachments: PostAttachment[];
  }) {
    if (!currentUser) return;
    const post = await insertPost({
      title: data.title,
      body: data.body,
      category: data.category,
      author: currentUser,
      gameId: data.gameId,
      attachments: data.attachments,
    });
    if (post) {
      setPosts((prev) => [post, ...prev]);
      const targetTab = data.category === 'posts' ? 'posts' : data.category;
      setTab(targetTab as Tab);
    }
  }

  async function handleReaction(postId: string, type: 'rock' | 'popsa') {
    if (!currentUser) return;
    await toggleReaction(postId, currentUser, type);
  }

  async function handleComment(postId: string, text: string, imageUrl?: string, guestName?: string) {
    const author = currentUser ?? guestName;
    if (!author) return;
    await insertComment({ postId, author, text, imageUrl });
  }

  async function handleFollow(author: string) {
    if (!currentUser || author === currentUser) return;
    const me = profiles[currentUser] ?? { nickname: currentUser, following: [] };
    const following = me.following.includes(author)
      ? me.following.filter((a) => a !== author)
      : [...me.following, author];
    const updated = { ...profiles, [currentUser]: { ...me, following } };
    setProfiles(updated);
    await updateProfileFollowing(currentUser, following);
  }

  function openDM(peer: string) {
    setDmPeer(peer);
    setShowDM(true);
  }

  async function handleSendDM(msg: StoredMessage) {
    await insertMessage({ sender: msg.sender, recipient: msg.recipient, body: msg.body });
    await refreshMessages();
  }

  function openGame(gameId: string) {
    window.location.hash = `/games/${gameId}`;
  }

  function backToFeed() {
    window.location.hash = '';
    setTab('games');
  }

  const defaultCategory: PostCategory = tab === 'games' ? 'posts' : (tab as PostCategory);

  // ---- Game hub view ----
  if (hashRoute.route === 'game' && hashRoute.gameId) {
    const game = games.find((g) => g.id === hashRoute.gameId);
    if (game) {
      return (
        <div className="app">
          <div className="scanlines" aria-hidden="true" />
          <header className="header">
            <div className="header__top">
              <div className="logo">
                <span className="logo__glitch">Murascore</span>
                <span className="logo__tag">Пиксельный пост-форум</span>
              </div>
              <LoginBar
                currentUser={currentUser}
                onRegister={handleRegister}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onOpenDM={() => { setDmPeer(null); setShowDM(true); }}
              />
              <MobileNav
                currentUser={currentUser}
                activeTab={tab}
                onTabChange={setTab}
                onOpenProfile={() => { window.location.hash = '/profile'; }}
                onOpenDM={() => { setDmPeer(null); setShowDM(true); }}
              />
            </div>
          </header>
          <main className="main">
            <GameHub
              game={game}
              posts={posts}
              currentUser={currentUser}
              onBack={backToFeed}
              onPostCreated={refreshPosts}
            />
          </main>
          <footer className="footer">
            <span>Murascore © 2026</span>
            <span>// NO GODS NO MASTERS NO PREMODERATION</span>
          </footer>
        </div>
      );
    }
  }

  // ---- Profile view ----
  if (hashRoute.route === 'profile' && currentUser) {
    return (
      <div className="app">
        <div className="scanlines" aria-hidden="true" />
        <header className="header">
          <div className="header__top">
            <div className="logo">
              <span className="logo__glitch">Murascore</span>
              <span className="logo__tag">Пиксельный пост-форум</span>
            </div>
            <LoginBar
              currentUser={currentUser}
              onRegister={handleRegister}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onOpenDM={() => { setDmPeer(null); setShowDM(true); }}
            />
            <MobileNav
              currentUser={currentUser}
              activeTab={tab}
              onTabChange={setTab}
              onOpenProfile={() => { window.location.hash = '/profile'; }}
              onOpenDM={() => { setDmPeer(null); setShowDM(true); }}
            />
          </div>
        </header>
        <main className="main">
          <button className="btn btn--ghost" onClick={backToFeed}>← НАЗАД</button>
          <UserProfile
            nickname={currentUser}
            profile={profile ?? { nickname: currentUser, following: [] }}
            onBannerUpdated={async () => setProfiles(await loadProfiles())}
            onAvatarUpdated={async () => setProfiles(await loadProfiles())}
          />
        </main>
        <footer className="footer">
          <span>Murascore © 2026</span>
          <span>// NO GODS NO MASTERS NO PREMODERATION</span>
        </footer>
      </div>
    );
  }

  // ---- Main feed view ----
  return (
    <div className="app">
      <div className="scanlines" aria-hidden="true" />
      <header className="header">
        <div className="header__top">
          <div className="logo">
            <span className="logo__glitch">Murascore</span>
            <span className="logo__tag">Пиксельный пост-форум</span>
          </div>
          <LoginBar
            currentUser={currentUser}
            onRegister={handleRegister}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onOpenDM={() => { setDmPeer(null); setShowDM(true); }}
          />
          <MobileNav
            currentUser={currentUser}
            activeTab={tab}
            onTabChange={setTab}
            onOpenProfile={() => { window.location.hash = '/profile'; }}
            onOpenDM={() => { setDmPeer(null); setShowDM(true); }}
          />
        </div>
        <TabNav active={tab} onChange={setTab} />
      </header>

      <main className="main">
        {tab === 'music' ? (
          <MusicTab currentUser={currentUser} />
        ) : tab === 'books' ? (
          <BooksTab />
        ) : tab === 'games' ? (
          <>
            <PostComposer
              games={games}
              currentUser={currentUser}
              defaultCategory={defaultCategory}
              onPublish={handlePublish}
            />
            <GamesTab
              games={games}
              search={gameSearch}
              onSearchChange={setGameSearch}
              onAddGame={() => setShowAddGame(true)}
              onOpenGame={openGame}
            />
          </>
        ) : (
          <>
            <PostComposer
              games={games}
              currentUser={currentUser}
              defaultCategory={defaultCategory}
              onPublish={handlePublish}
            />
            <FeedTab
              tab={tab}
              posts={posts}
              games={games}
              currentUser={currentUser}
              isFollowing={isFollowing}
              onRock={(id) => handleReaction(id, 'rock')}
              onPopsa={(id) => handleReaction(id, 'popsa')}
              onFollow={handleFollow}
              onComment={handleComment}
              onOpenDM={openDM}
            />
          </>
        )}
      </main>

      <footer className="footer">
        <span>Murascore © 2026</span>
        <span>// NO GODS NO MASTERS NO PREMODERATION</span>
      </footer>

      {showAddGame && (
        <AddGameModal onClose={() => setShowAddGame(false)} onAdd={handleAddGame} />
      )}

      {showDM && currentUser && (
        <DMPanel
          currentUser={currentUser}
          messages={messages}
          following={profile?.following ?? []}
          initialPeer={dmPeer}
          onClose={() => { setShowDM(false); setDmPeer(null); }}
          onMessagesChanged={refreshMessages}
        />
      )}
    </div>
  );
}

export default App;
