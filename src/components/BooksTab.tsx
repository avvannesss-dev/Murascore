import { useEffect, useState } from 'react';
import { Book, BookOpen, ChevronLeft, ChevronRight, Moon, Sun, Plus, Type } from 'lucide-react';
import type { Book as BookType, BookChapter } from '../types';
import { getBooks, getBookChapters, insertBook, insertBookChapter, deleteBook } from '../lib/storage';

export function BooksTab() {
  const [books, setBooks] = useState<BookType[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);

  useEffect(() => {
    void loadBooks();
  }, []);

  async function loadBooks() {
    const b = await getBooks();
    setBooks(b);
  }

  async function openBook(book: BookType) {
    setSelectedBook(book);
    const c = await getBookChapters(book.id);
    setChapters(c);
  }

  async function handleAddBook(title: string, description: string) {
    await insertBook({ title, description });
    setShowAddBook(false);
    await loadBooks();
  }

  async function handleAddChapter(title: string, content: string) {
    if (!selectedBook) return;
    await insertBookChapter({
      bookId: selectedBook.id,
      title,
      content,
      orderIndex: chapters.length,
    });
    setShowAddChapter(false);
    const c = await getBookChapters(selectedBook.id);
    setChapters(c);
  }

  if (selectedBook) {
    return (
      <BookReader
        book={selectedBook}
        chapters={chapters}
        onBack={() => { setSelectedBook(null); setChapters([]); }}
        onAddChapter={() => setShowAddChapter(true)}
        showAddChapter={showAddChapter}
        onAddChapterSubmit={handleAddChapter}
        onDeleteBook={async () => {
          await deleteBook(selectedBook.id);
          setSelectedBook(null);
          setChapters([]);
          await loadBooks();
        }}
      />
    );
  }

  return (
    <div className="bookstab">
      <div className="bookstab__header">
        <BookOpen size={28} className="bookstab__icon" />
        <h2 className="bookstab__title">Библиотека Игоря Горь</h2>
        <button className="btn btn--accent" onClick={() => setShowAddBook(true)}>
          <Plus size={16} /> ДОБАВИТЬ КНИГУ
        </button>
      </div>

      {showAddBook && (
        <AddBookForm onSubmit={handleAddBook} onCancel={() => setShowAddBook(false)} />
      )}

      <div className="bookstab__grid">
        {books.length === 0 && <div className="feed__empty">НЕТ КНИГ</div>}
        {books.map((book) => (
          <div key={book.id} className="bookcard" onClick={() => openBook(book)}>
            <div className="bookcard__cover">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="bookcard__img" />
              ) : (
                <Book size={48} className="bookcard__icon" />
              )}
            </div>
            <div className="bookcard__info">
              <span className="bookcard__title">{book.title}</span>
              <span className="bookcard__author">{book.author}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddBookForm({ onSubmit, onCancel }: { onSubmit: (title: string, desc: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  return (
    <div className="modal-card">
      <input className="composer__title" type="text" placeholder="НАЗВАНИЕ КНИГИ" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="composer__body" placeholder="ОПИСАНИЕ" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="composer__row">
        <button className="btn btn--accent" onClick={() => onSubmit(title, desc)} disabled={!title.trim()}>СОЗДАТЬ</button>
        <button className="btn btn--ghost" onClick={onCancel}>ОТМЕНА</button>
      </div>
    </div>
  );
}

function BookReader({
  book, chapters, onBack, onAddChapter, showAddChapter, onAddChapterSubmit, onDeleteBook,
}: {
  book: BookType;
  chapters: BookChapter[];
  onBack: () => void;
  onAddChapter: () => void;
  showAddChapter: boolean;
  onAddChapterSubmit: (title: string, content: string) => void;
  onDeleteBook: () => void;
}) {
  const [chapterIdx, setChapterIdx] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(16);

  const chapter = chapters[chapterIdx];

  function renderContent(text: string) {
    const parts = text.split(/(\{0\.44\})/g);
    return parts.map((part, i) =>
      part === '{0.44}'
        ? <span key={i} className="reader__easter">{part}</span>
        : <span key={i}>{part}</span>
    );
  }

  return (
    <div className={`reader ${darkMode ? 'reader--dark' : 'reader--light'}`}>
      <div className="reader__header">
        <button className="btn btn--ghost" onClick={onBack}><ChevronLeft size={16} /> НАЗАД</button>
        <h2 className="reader__title">{book.title}</h2>
        <div className="reader__controls">
          <button className="reader__btn" onClick={() => setFontSize((s) => Math.max(12, s - 2))} title="Меньше шрифт">
            <Type size={14} />
          </button>
          <button className="reader__btn" onClick={() => setFontSize((s) => Math.min(28, s + 2))} title="Больше шрифт">
            <Type size={20} />
          </button>
          <button className="reader__btn" onClick={() => setDarkMode(!darkMode)} title="Сменить тему">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      <div className="reader__body">
        <div className="reader__sidebar">
          <span className="reader__sidebar-title">ГЛАВЫ</span>
          {chapters.map((ch, i) => (
            <button
              key={ch.id}
              className={`reader__chapter ${i === chapterIdx ? 'reader__chapter--active' : ''}`}
              onClick={() => setChapterIdx(i)}
            >
              {i + 1}. {ch.title}
            </button>
          ))}
          <button className="btn btn--ghost reader__add-chapter" onClick={onAddChapter}>
            <Plus size={14} /> ГЛАВА
          </button>
          <button className="btn btn--ghost reader__delete-book" onClick={onDeleteBook}>
            УДАЛИТЬ КНИГУ
          </button>
        </div>

        <div className="reader__content" style={{ fontSize: `${fontSize}px` }}>
          {showAddChapter && (
            <AddChapterForm onSubmit={onAddChapterSubmit} onCancel={onAddChapter} />
          )}
          {!showAddChapter && chapter && (
            <>
              <h3 className="reader__chapter-title">{chapter.title}</h3>
              <div className="reader__text">{renderContent(chapter.content)}</div>
              <div className="reader__nav">
                <button
                  className="btn btn--ghost"
                  onClick={() => setChapterIdx((i) => Math.max(0, i - 1))}
                  disabled={chapterIdx === 0}
                >
                  <ChevronLeft size={16} /> ПРЕД.
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() => setChapterIdx((i) => Math.min(chapters.length - 1, i + 1))}
                  disabled={chapterIdx === chapters.length - 1}
                >
                  СЛЕД. <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
          {!showAddChapter && !chapter && (
            <div className="feed__empty">НЕТ ГЛАВ. ДОБАВЬТЕ ПЕРВУЮ ГЛАВУ.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddChapterForm({ onSubmit, onCancel }: { onSubmit: (title: string, content: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  return (
    <div className="modal-card">
      <input className="composer__title" type="text" placeholder="НАЗВАНИЕ ГЛАВЫ" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        className="composer__body"
        placeholder="ТЕКСТ ГЛАВЫ... Используйте {0.44} для пасхалки"
        rows={12}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="composer__row">
        <button className="btn btn--accent" onClick={() => onSubmit(title, content)} disabled={!title.trim()}>ДОБАВИТЬ</button>
        <button className="btn btn--ghost" onClick={onCancel}>ОТМЕНА</button>
      </div>
    </div>
  );
}
