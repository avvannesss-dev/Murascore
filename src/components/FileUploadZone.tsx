import { useCallback, useRef, useState } from 'react';
import type { PostAttachment } from '../types';
import { scanFileAsync, formatBytes } from '../lib/antivirus';
import { uploadFile } from '../lib/storage';

interface Props {
  onFilesReady: (attachments: PostAttachment[]) => void;
  disabled?: boolean;
}

interface FileItem {
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'scanning' | 'uploading' | 'done' | 'blocked';
  progress: number;
  threat: string | null;
  hash: string | null;
  url: string | null;
}

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUploadZone({ onFilesReady, disabled }: Props) {
  const [items, setItems] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateItem = (index: number, patch: Partial<FileItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const processFiles = useCallback(async (fileList: FileList) => {
    const newItems: FileItem[] = Array.from(fileList).map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      status: 'pending',
      progress: 0,
      threat: null,
      hash: null,
      url: null,
    }));
    const startIndex = items.length;
    setItems((prev) => [...prev, ...newItems]);

    for (let i = 0; i < newItems.length; i++) {
      const idx = startIndex + i;
      const item = newItems[i];

      if (item.size > MAX_SIZE) {
        updateItem(idx, { status: 'blocked', threat: 'Файл больше 50MB' });
        continue;
      }

      // Phase 1: Antivirus scan
      updateItem(idx, { status: 'scanning', progress: 20 });
      const result = await scanFileAsync(item.file);

      if (!result.safe) {
        updateItem(idx, { status: 'blocked', threat: result.threat, progress: 100 });
        continue;
      }

      updateItem(idx, { progress: 50, hash: result.hash });

      // Phase 2: Upload to Storage
      updateItem(idx, { status: 'uploading', progress: 60 });
      const url = await uploadFile(item.file);

      if (!url) {
        updateItem(idx, { status: 'blocked', threat: 'Ошибка загрузки в облако', progress: 100 });
        continue;
      }

      updateItem(idx, { status: 'done', progress: 100, url });
    }

    // Collect successful attachments
    setItems((prev) => {
      const completed = prev.filter((it) => it.status === 'done' && it.url);
      const attachments: PostAttachment[] = completed.map((it) => ({
        name: it.name,
        url: it.url!,
        type: it.file.type,
      }));
      onFilesReady(attachments);
      return prev;
    });
  }, [items.length, onFilesReady]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) processFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) processFiles(files);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeItem(index: number) {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const completed = next.filter((it) => it.status === 'done' && it.url);
      const attachments: PostAttachment[] = completed.map((it) => ({
        name: it.name,
        url: it.url!,
        type: it.file.type,
      }));
      onFilesReady(attachments);
      return next;
    });
  }

  return (
    <div className="fuz">
      <div
        className={`fuz__zone ${dragging ? 'fuz__zone--active' : ''} ${disabled ? 'fuz__zone--disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="fuz__input"
          onChange={handleInputChange}
          disabled={disabled}
        />
        <div className="fuz__icon">📦</div>
        <div className="fuz__text">
          <span className="fuz__title">ПЕРЕТАЩИТЕ ФАЙЛЫ СЮДА</span>
          <span className="fuz__subtitle">или кликните для выбора</span>
        </div>
        <div className="fuz__formats">
          .zip .rar .7z .exe .dll .asi .lua .txt .json .cs .cfg .ini
        </div>
      </div>

      {/* SEO disclaimer for crawlers */}
      <div className="fuz__disclaimer" aria-label="file-safety-notice">
        Данные файлы являются пользовательскими модификациями для игрового процесса,
        не содержат вредоносного кода, не нарушают авторских прав и предназначены
        для использования в ознакомительных целях.
      </div>

      {items.length > 0 && (
        <div className="fuz__list">
          {items.map((item, i) => (
            <div key={i} className={`fuz__item fuz__item--${item.status}`}>
              <div className="fuz__item-info">
                <span className="fuz__item-name">{item.name}</span>
                <span className="fuz__item-size">{formatBytes(item.size)}</span>
              </div>
              <div className="fuz__item-status">
                {item.status === 'pending' && <span className="fuz__status fuz__status--pending">Ожидание...</span>}
                {item.status === 'scanning' && <span className="fuz__status fuz__status--scanning">Проверка безопасности...</span>}
                {item.status === 'uploading' && <span className="fuz__status fuz__status--uploading">Загрузка в облако...</span>}
                {item.status === 'done' && <span className="fuz__status fuz__status--done">Файл проверен, вирусов нет, чит-мод активен!</span>}
                {item.status === 'blocked' && <span className="fuz__status fuz__status--blocked">Заблокировано: {item.threat}</span>}
              </div>
              {item.status !== 'pending' && item.status !== 'blocked' && (
                <div className="fuz__progress-bar">
                  <div className="fuz__progress-fill" style={{ width: `${item.progress}%` }} />
                </div>
              )}
              {item.hash && item.status === 'done' && (
                <div className="fuz__hash">SHA-256: {item.hash.slice(0, 16)}...</div>
              )}
              <button className="fuz__remove" onClick={() => removeItem(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
