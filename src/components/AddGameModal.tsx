import { useState } from 'react';

interface Props {
  onClose: () => void;
  onAdd: (name: string, coverUrl: string) => void;
}

export function AddGameModal({ onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  function handleAdd() {
    if (!name.trim()) return;
    onAdd(name.trim(), coverUrl.trim());
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">ДОБАВИТЬ ИГРУ</span>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <label className="modal__label">Название игры</label>
          <input
            className="modal__input"
            type="text"
            placeholder="НАЗВАНИЕ..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          />
          <label className="modal__label">URL обложки (необязательно)</label>
          <input
            className="modal__input"
            type="text"
            placeholder="https://..."
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
          />
        </div>
        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>ОТМЕНА</button>
          <button className="btn btn--accent" onClick={handleAdd} disabled={!name.trim()}>
            ДОБАВИТЬ
          </button>
        </div>
      </div>
    </div>
  );
}
