import { useState } from 'react';

interface Props {
  currentUser: string | null;
  onRegister: (nick: string, pass: string) => Promise<string | null>;
  onLogin: (nick: string, pass: string) => Promise<string | null>;
  onLogout: () => void;
  onOpenDM: () => void;
}

export function LoginBar({ currentUser, onRegister, onLogin, onLogout, onOpenDM }: Props) {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
    setError(null);
    setBusy(true);
    const err = await onRegister(nickname.trim(), password);
    setBusy(false);
    if (err) setError(err);
    else { setNickname(''); setPassword(''); }
  }

  async function handleLogin() {
    setError(null);
    setBusy(true);
    const err = await onLogin(nickname.trim(), password);
    setBusy(false);
    if (err) setError(err);
    else { setNickname(''); setPassword(''); }
  }

  if (currentUser) {
    return (
      <div className="loginbar">
        <span className="loginbar__user">⚡ {currentUser}</span>
        <button className="btn btn--ghost" onClick={() => window.location.hash = '/profile'}>👤 ПРОФИЛЬ</button>
        <button className="btn btn--ghost" onClick={onOpenDM}>✉ DM</button>
        <button className="btn btn--ghost" onClick={onLogout}>ВЫЙТИ</button>
      </div>
    );
  }

  return (
    <div className="loginbar">
      <input
        className="loginbar__input"
        type="text"
        placeholder="НИК"
        value={nickname}
        maxLength={24}
        onChange={(e) => setNickname(e.target.value)}
      />
      <input
        className="loginbar__input"
        type="password"
        placeholder="ПАРОЛЬ"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
      />
      <button className="btn btn--accent" onClick={handleLogin} disabled={busy}>
        {busy ? '...' : 'ВОЙТИ'}
      </button>
      <button className="btn btn--ghost" onClick={handleRegister} disabled={busy}>
        {busy ? '...' : 'РЕГИСТРАЦИЯ'}
      </button>
      {error && <span className="loginbar__error">{error}</span>}
    </div>
  );
}
