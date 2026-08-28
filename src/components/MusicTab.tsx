import { useEffect, useRef, useState } from 'react';
import { Music, Play, Pause, Download, Upload, SkipForward, SkipBack, Volume2, ChevronLeft, Plus, Disc3, Users } from 'lucide-react';
import type { MusicTrack, MusicBand, MusicAlbum } from '../types';
import {
  getMusicBands,
  insertMusicBand,
  deleteMusicBand,
  getAlbumsByBand,
  insertMusicAlbum,
  deleteMusicAlbum,
  getTracksByAlbum,
  insertMusicTrack,
  deleteMusicTrack,
  uploadFile,
  uploadImage,
  supabase,
} from '../lib/storage';

type View = 'bands' | 'band' | 'album';

function renderEaster(text: string): React.ReactNode {
  const parts = text.split(/(\{0\.44\})/g);
  return parts.map((part, i) =>
    part === '{0.44}'
      ? <span key={i} className="music__easter">{part}</span>
      : <span key={i}>{part}</span>
  );
}

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MusicTab({ currentUser }: { currentUser: string | null }) {
  const [view, setView] = useState<View>('bands');
  const [bands, setBands] = useState<MusicBand[]>([]);
  const [selectedBand, setSelectedBand] = useState<MusicBand | null>(null);
  const [albums, setAlbums] = useState<MusicAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<MusicAlbum | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [showAddBand, setShowAddBand] = useState(false);
  const [showAddAlbum, setShowAddAlbum] = useState(false);

  useEffect(() => {
    void loadBands();
  }, []);

  // Realtime: refresh bands when music_bands changes
  useEffect(() => {
    const channel = supabase
      .channel('music-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_bands' }, () => { void loadBands(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_albums' }, () => {
        if (selectedBand) void loadAlbums(selectedBand.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_tracks' }, () => {
        if (selectedAlbum) void loadTracks(selectedAlbum.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBand, selectedAlbum]);

  async function loadBands() {
    setBands(await getMusicBands());
  }

  async function loadAlbums(bandId: string) {
    setAlbums(await getAlbumsByBand(bandId));
  }

  async function loadTracks(albumId: string) {
    setTracks(await getTracksByAlbum(albumId));
  }

  function openBand(band: MusicBand) {
    setSelectedBand(band);
    setView('band');
    void loadAlbums(band.id);
  }

  function openAlbum(album: MusicAlbum) {
    setSelectedAlbum(album);
    setView('album');
    void loadTracks(album.id);
  }

  function backToBands() {
    setView('bands');
    setSelectedBand(null);
    setAlbums([]);
  }

  function backToBand() {
    setView('band');
    setSelectedAlbum(null);
    setTracks([]);
  }

  // ---- BANDS GRID (Level 1) ----
  if (view === 'bands') {
    return (
      <div className="musictab">
        <div className="musictab__header">
          <Music size={28} className="musictab__icon" />
          <h2 className="musictab__title">МУЗЫКАЛЬНОЕ СООБЩЕСТВО</h2>
          {currentUser && (
            <button className="btn btn--accent" onClick={() => setShowAddBand(true)}>
              <Plus size={16} /> СОЗДАТЬ ГРУППУ
            </button>
          )}
        </div>

        {showAddBand && currentUser && (
          <AddBandForm
            onAdd={async (name, desc, avatarUrl) => {
              await insertMusicBand({ name, description: desc, avatarUrl });
              setShowAddBand(false);
              await loadBands();
            }}
            onCancel={() => setShowAddBand(false)}
          />
        )}

        <div className="music__bands-grid">
          {bands.length === 0 && (
            <div className="feed__empty">НЕТ ГРУПП. СОЗДАЙТЕ ПЕРВУЮ!</div>
          )}
          {bands.map((band) => (
            <div key={band.id} className="music__band-card" onClick={() => openBand(band)}>
              <div className="music__band-avatar">
                {band.avatarUrl ? (
                  <img src={band.avatarUrl} alt={band.name} className="music__band-img" />
                ) : (
                  <Users size={40} className="music__band-placeholder" />
                )}
              </div>
              <span className="music__band-name">{renderEaster(band.name)}</span>
              {band.description && <span className="music__band-desc">{band.description}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- BAND PAGE (Level 2) ----
  if (view === 'band' && selectedBand) {
    return (
      <div className="musictab">
        <div className="musictab__header">
          <button className="btn btn--ghost" onClick={backToBands}>
            <ChevronLeft size={16} /> НАЗАД
          </button>
          <h2 className="musictab__title">{renderEaster(selectedBand.name)}</h2>
          {currentUser && (
            <button className="btn btn--accent" onClick={() => setShowAddAlbum(true)}>
              <Plus size={16} /> СОЗДАТЬ АЛЬБОМ
            </button>
          )}
        </div>

        {selectedBand.description && (
          <p className="music__band-description">{selectedBand.description}</p>
        )}

        {showAddAlbum && currentUser && (
          <AddAlbumForm
            onAdd={async (title, coverUrl) => {
              await insertMusicAlbum({ bandId: selectedBand.id, title, coverUrl });
              setShowAddAlbum(false);
              await loadAlbums(selectedBand.id);
            }}
            onCancel={() => setShowAddAlbum(false)}
          />
        )}

        <div className="music__albums-grid">
          {albums.length === 0 && (
            <div className="feed__empty">НЕТ АЛЬБОМОВ. СОЗДАЙТЕ ПЕРВЫЙ!</div>
          )}
          {albums.map((album) => (
            <div key={album.id} className="music__album-card" onClick={() => openAlbum(album)}>
              <div className="music__album-cover">
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.title} className="music__album-img" />
                ) : (
                  <Disc3 size={48} className="music__album-placeholder" />
                )}
              </div>
              <span className="music__album-title">{renderEaster(album.title)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- ALBUM PAGE (Level 3) ----
  if (view === 'album' && selectedBand && selectedAlbum) {
    return (
      <AlbumView
        band={selectedBand}
        album={selectedAlbum}
        tracks={tracks}
        currentUser={currentUser}
        onBack={backToBand}
        onTracksChanged={() => loadTracks(selectedAlbum.id)}
      />
    );
  }

  return null;
}

// ============================================================
// ALBUM VIEW (Level 3) — with player + tracklist
// ============================================================
function AlbumView({
  band, album, tracks, currentUser, onBack, onTracksChanged,
}: {
  band: MusicBand;
  album: MusicAlbum;
  tracks: MusicTrack[];
  currentUser: string | null;
  onBack: () => void;
  onTracksChanged: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  const current = tracks[currentIdx];

  function playTrack(idx: number) {
    setCurrentIdx(idx);
    setPlaying(true);
    setTimeout(() => {
      audioRef.current?.play();
      setupVisualizer();
    }, 50);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
      setupVisualizer();
    }
  }

  function nextTrack() {
    if (tracks.length === 0) return;
    playTrack((currentIdx + 1) % tracks.length);
  }

  function prevTrack() {
    if (tracks.length === 0) return;
    playTrack((currentIdx - 1 + tracks.length) % tracks.length);
  }

  function setupVisualizer() {
    if (audioCtxRef.current) return;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;
      const source = ctx.createMediaElementSource(audioRef.current!);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      drawVisualizer();
    } catch {
      // AudioContext may fail if already connected
    }
  }

  function drawVisualizer() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.fillStyle = '#060606';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const hue = 20 + (i / bufferLength) * 30;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
      }
    };
    draw();
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  function handleTimeUpdate() {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
    setDuration(audioRef.current.duration || 0);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = val;
    setProgress(val);
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = await uploadFile(file);
      if (url) {
        const title = uploadTitle.trim() || file.name.replace(/\.[^.]+$/, '');
        await insertMusicTrack({
          title,
          artist: band.name,
          audioUrl: url,
          albumId: album.id,
          orderIndex: tracks.length + i,
        });
      }
    }
    setUploadTitle('');
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    onTracksChanged();
  }

  return (
    <div className="musictab">
      <div className="musictab__header">
        <button className="btn btn--ghost" onClick={onBack}>
          <ChevronLeft size={16} /> НАЗАД
        </button>
        <h2 className="musictab__title">{renderEaster(album.title)}</h2>
      </div>

      <div className="music__album-header">
        <div className="music__album-cover-large">
          {album.coverUrl ? (
            <img src={album.coverUrl} alt={album.title} className="music__album-img-large" />
          ) : (
            <Disc3 size={64} className="music__album-placeholder" />
          )}
        </div>
        <div className="music__album-info">
          <span className="music__album-band">{renderEaster(band.name)}</span>
          <span className="music__album-name">{renderEaster(album.title)}</span>
          <span className="music__album-count">{tracks.length} треков</span>
        </div>
      </div>

      <div className="musictab__player">
        <canvas ref={canvasRef} className="musictab__visualizer" width={600} height={80} />

        {current ? (
          <div className="musictab__current">
            <span className="musictab__track-title">{renderEaster(current.title)}</span>
            <span className="musictab__track-artist">{current.artist}</span>
          </div>
        ) : (
          <div className="musictab__current">
            <span className="musictab__track-title">ВЫБЕРИТЕ ТРЕК</span>
          </div>
        )}

        <div className="musictab__progress-row">
          <span className="musictab__time">{formatTime(progress)}</span>
          <input
            className="musictab__seek"
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
          />
          <span className="musictab__time">{formatTime(duration)}</span>
        </div>

        <div className="musictab__controls">
          <button className="musictab__btn" onClick={prevTrack} disabled={tracks.length === 0}>
            <SkipBack size={20} />
          </button>
          <button className="musictab__btn musictab__btn--play" onClick={togglePlay} disabled={!current}>
            {playing ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button className="musictab__btn" onClick={nextTrack} disabled={tracks.length === 0}>
            <SkipForward size={20} />
          </button>
          <div className="musictab__volume">
            <Volume2 size={16} />
            <input
              className="musictab__vol"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolume}
            />
          </div>
          {current && (
            <a className="musictab__btn" href={current.audioUrl} download target="_blank" rel="noopener noreferrer" title="Скачать трек">
              <Download size={18} />
            </a>
          )}
        </div>

        <audio
          ref={audioRef}
          src={current?.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={nextTrack}
          crossOrigin="anonymous"
        />
      </div>

      {currentUser && (
        <div className="musictab__upload">
          <input
            className="musictab__upload-title"
            type="text"
            placeholder="Название трека (пусто = имя файла)"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
          />
          <input ref={fileRef} type="file" accept="audio/*" multiple className="comment__file-hidden" onChange={handleUpload} />
          <button className="btn btn--ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload size={16} /> {uploading ? '...' : 'ЗАГРУЗИТЬ ТРЕК'}
          </button>
        </div>
      )}

      <div className="musictab__playlist">
        {tracks.length === 0 && <div className="feed__empty">НЕТ ТРЕКОВ В АЛЬБОМЕ</div>}
        {tracks.map((track, i) => (
          <div
            key={track.id}
            className={`musictab__track ${i === currentIdx ? 'musictab__track--active' : ''}`}
            onClick={() => playTrack(i)}
          >
            <span className="musictab__track-num">{i + 1}</span>
            <div className="musictab__track-info">
              <span className="musictab__track-name">{renderEaster(track.title)}</span>
              <span className="musictab__track-artist">{track.artist}</span>
            </div>
            <a
              className="musictab__track-download"
              href={track.audioUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={16} />
            </a>
            {currentUser && (
              <button
                className="musictab__track-delete"
                onClick={(e) => { e.stopPropagation(); void deleteMusicTrack(track.id).then(onTracksChanged); }}
              >✕</button>
            )}
          </div>
        ))}
      </div>

      <div className="fuz__disclaimer">
        Музыкальные треки предоставлены группой «УдОвОлЬсТвИе НоЧу» для прослушивания
        на платформе Murascore. Все права принадлежат правообладателям.
      </div>
    </div>
  );
}

// ============================================================
// ADD BAND FORM
// ============================================================
function AddBandForm({ onAdd, onCancel }: {
  onAdd: (name: string, desc: string, avatarUrl?: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    if (url) setAvatarUrl(url);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="modal-card">
      <input className="composer__title" type="text" placeholder="НАЗВАНИЕ ГРУППЫ" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
      <textarea className="composer__body" placeholder="ОПИСАНИЕ ГРУППЫ" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="music__avatar-upload">
        {avatarUrl && <img src={avatarUrl} alt="avatar" className="music__avatar-preview" />}
        <input ref={fileRef} type="file" accept="image/*" className="comment__file-hidden" onChange={handleAvatar} />
        <button className="btn btn--ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload size={14} /> {uploading ? '...' : 'АВАТАР ГРУППЫ'}
        </button>
      </div>
      <div className="composer__row">
        <button className="btn btn--accent" onClick={() => onAdd(name, desc, avatarUrl)} disabled={!name.trim()}>СОЗДАТЬ</button>
        <button className="btn btn--ghost" onClick={onCancel}>ОТМЕНА</button>
      </div>
    </div>
  );
}

// ============================================================
// ADD ALBUM FORM
// ============================================================
function AddAlbumForm({ onAdd, onCancel }: {
  onAdd: (title: string, coverUrl?: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    if (url) setCoverUrl(url);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="modal-card">
      <input className="composer__title" type="text" placeholder="НАЗВАНИЕ АЛЬБОМА" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
      <div className="music__avatar-upload">
        {coverUrl && <img src={coverUrl} alt="cover" className="music__avatar-preview" />}
        <input ref={fileRef} type="file" accept="image/*" className="comment__file-hidden" onChange={handleCover} />
        <button className="btn btn--ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload size={14} /> {uploading ? '...' : 'ОБЛОЖКА АЛЬБОМА'}
        </button>
      </div>
      <div className="composer__row">
        <button className="btn btn--accent" onClick={() => onAdd(title, coverUrl)} disabled={!title.trim()}>СОЗДАТЬ</button>
        <button className="btn btn--ghost" onClick={onCancel}>ОТМЕНА</button>
      </div>
    </div>
  );
}
