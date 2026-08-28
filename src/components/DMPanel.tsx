import { useEffect, useRef, useState } from 'react';
import { Ban, Check, CheckCheck, ChevronLeft, Paperclip, Send, X } from 'lucide-react';
import type { StoredMessage } from '../types';
import { supabase, insertMessage, markMessagesRead, uploadFile, blockUser, unblockUser, getBlockedUsers } from '../lib/storage';
import { scanFileAsync } from '../lib/antivirus';

interface Props {
  currentUser: string;
  messages: StoredMessage[];
  following: string[];
  initialPeer: string | null;
  onClose: () => void;
  onMessagesChanged: () => void;
}

interface PeerInfo {
  nick: string;
  lastMessage?: StoredMessage;
  unread: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function playNotification() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // ignore
  }
}

export function DMPanel({ currentUser, messages, following, initialPeer, onClose, onMessagesChanged }: Props) {
  const [peer, setPeer] = useState(initialPeer ?? '');
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(initialPeer ? 'chat' : 'list');
  const threadRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number>(0);

  // Load blocked users
  useEffect(() => {
    void (async () => {
      const b = await getBlockedUsers(currentUser);
      setBlocked(b.map((x) => x.blocked));
    })();
  }, [currentUser]);

  // Realtime subscription for messages
  useEffect(() => {
    const channel = supabase
      .channel('dm-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as StoredMessage;
        if (msg.recipient === currentUser) {
          playNotification();
          onMessagesChanged();
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.sender === peer && payload.payload?.recipient === currentUser) {
          setTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = window.setTimeout(() => setTyping(false), 3000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, peer, onMessagesChanged]);

  // Mark messages as read when opening thread
  useEffect(() => {
    if (peer) {
      void markMessagesRead(peer, currentUser).then(() => onMessagesChanged());
    }
  }, [peer, currentUser, onMessagesChanged]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, peer]);

  const peers: PeerInfo[] = Array.from(
    new Set([
      ...following,
      ...messages
        .filter((m) => m.sender === currentUser || m.recipient === currentUser)
        .flatMap((m) => [m.sender, m.recipient])
        .filter((n) => n !== currentUser),
    ]),
  ).map((nick) => {
    const peerMsgs = messages
      .filter((m) => (m.sender === currentUser && m.recipient === nick) || (m.sender === nick && m.recipient === currentUser))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const lastMessage = peerMsgs[peerMsgs.length - 1];
    const unread = peerMsgs.filter((m) => m.sender === nick && !m.read).length;
    return { nick, lastMessage, unread };
  });

  const activePeer = peer || peers[0]?.nick || '';

  const thread = messages
    .filter(
      (m) =>
        (m.sender === currentUser && m.recipient === activePeer) ||
        (m.sender === activePeer && m.recipient === currentUser),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const isBlocked = blocked.includes(activePeer);

  function broadcastTyping() {
    const channel = supabase.channel('dm-realtime');
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { sender: currentUser, recipient: activePeer },
    });
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value);
    if (e.target.value.trim()) broadcastTyping();
  }

  async function handleSend() {
    if (!text.trim() && !attachment) return;
    if (!activePeer.trim() || isBlocked) return;
    await insertMessage({
      sender: currentUser,
      recipient: activePeer.trim(),
      body: text.trim(),
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
    });
    setText('');
    setAttachment(null);
    onMessagesChanged();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBlockedMsg(null);
    if (file.size > 10 * 1024 * 1024) { setBlockedMsg('🚫 Файл больше 10MB'); return; }
    const result = await scanFileAsync(file);
    if (!result.safe) { setBlockedMsg(`🚫 ${result.threat}`); return; }
    setUploading(true);
    const url = await uploadFile(file);
    setUploading(false);
    if (url) setAttachment({ url, name: file.name });
    else setBlockedMsg('🚫 Ошибка загрузки');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleBlock() {
    if (!activePeer) return;
    if (isBlocked) {
      await unblockUser(currentUser, activePeer);
      setBlocked((prev) => prev.filter((b) => b !== activePeer));
    } else {
      await blockUser(currentUser, activePeer);
      setBlocked((prev) => [...prev, activePeer]);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="dm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">ЛИЧНЫЕ СООБЩЕНИЯ</span>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className={`dm__body dm__body--${mobileView}`}>
          <div className="dm__sidebar">
            <input
              className="dm__peer-input"
              type="text"
              placeholder="НИК..."
              value={peer}
              onChange={(e) => setPeer(e.target.value)}
            />
            {peers.length === 0 && <div className="dm__no-peers">НЕТ ДИАЛОГОВ</div>}
            {peers.map((p) => (
              <button
                key={p.nick}
                className={`dm__peer ${activePeer === p.nick ? 'dm__peer--active' : ''}`}
                onClick={() => { setPeer(p.nick); setMobileView('chat'); }}
              >
                <div className="dm__peer-info">
                  <span className="dm__peer-name">{p.nick}</span>
                  {p.lastMessage && (
                    <span className="dm__peer-preview">{p.lastMessage.body.slice(0, 30)}</span>
                  )}
                </div>
                {p.unread > 0 && <span className="dm__peer-unread">{p.unread}</span>}
              </button>
            ))}
          </div>
          <div className="dm__thread" ref={threadRef}>
            {activePeer && (
              <div className="dm__thread-header">
                <button className="dm__back-btn" onClick={() => setMobileView('list')} aria-label="Назад к диалогам">
                  <ChevronLeft size={18} />
                </button>
                <span className="dm__thread-peer">{activePeer}</span>
                <button className="dm__block-btn" onClick={handleBlock}>
                  <Ban size={14} /> {isBlocked ? 'РАЗБЛОКИРОВАТЬ' : 'БЛОКИРОВАТЬ'}
                </button>
              </div>
            )}
            {thread.length === 0 && (
              <div className="feed__empty">{activePeer ? 'НЕТ СООБЩЕНИЙ' : 'ВЫБЕРИТЕ ПОЛЬЗОВАТЕЛЯ'}</div>
            )}
            {thread.map((m) => (
              <div
                key={m.id}
                className={`dm__msg ${m.sender === currentUser ? 'dm__msg--me' : ''}`}
              >
                <span className="dm__msg-body">{m.body}</span>
                {m.attachmentUrl && (
                  <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="dm__msg-attachment">
                    📎 {m.attachmentName || 'файл'}
                  </a>
                )}
                <div className="dm__msg-meta">
                  <span className="dm__msg-time">{formatDate(m.createdAt)}</span>
                  {m.sender === currentUser && (
                    m.read
                      ? <CheckCheck size={14} className="dm__msg-read" />
                      : <Check size={14} className="dm__msg-sent" />
                  )}
                </div>
              </div>
            ))}
            {typing && activePeer && !isBlocked && (
              <div className="dm__typing">печатает...</div>
            )}
            {isBlocked && (
              <div className="dm__blocked-notice">Пользователь заблокирован. Разблокируйте, чтобы писать.</div>
            )}
          </div>
        </div>
        <div className="dm__footer">
          {attachment && (
            <div className="dm__attachment-preview">
              <span>📎 {attachment.name}</span>
              <button onClick={() => setAttachment(null)}><X size={12} /></button>
            </div>
          )}
          {blockedMsg && <span className="composer__blocked">{blockedMsg}</span>}
          <div className="dm__input-row">
            <input ref={fileRef} type="file" className="comment__file-hidden" onChange={handleFile} />
            <button
              className="dm__attach-btn"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || isBlocked}
              title="Прикрепить файл"
            >
              <Paperclip size={18} />
            </button>
            <input
              className="dm__input"
              type="text"
              placeholder={activePeer ? (isBlocked ? 'ЗАБЛОКИРОВАНО' : `СООБЩЕНИЕ ДЛЯ ${activePeer}...`) : 'ВЫБЕРИТЕ ПОЛЬЗОВАТЕЛЯ'}
              value={text}
              disabled={!activePeer || isBlocked}
              onChange={handleTextChange}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            />
            <button className="btn btn--accent dm__send-btn" onClick={handleSend} disabled={(!text.trim() && !attachment) || !activePeer || isBlocked}>
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
