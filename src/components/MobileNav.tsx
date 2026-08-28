import { useState } from 'react';
import { Menu, X, Gamepad2, Music, BookOpen, User, Mail } from 'lucide-react';
import type { Tab } from '../types';

interface Props {
  currentUser: string | null;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenProfile: () => void;
  onOpenDM: () => void;
}

export function MobileNav({ currentUser, activeTab, onTabChange, onOpenProfile, onOpenDM }: Props) {
  const [open, setOpen] = useState(false);

  function handleNav(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <>
      <button
        className="mobile-burger"
        onClick={() => setOpen(true)}
        aria-label="Открыть меню"
      >
        <Menu size={24} />
      </button>

      {open && (
        <div className="mobile-menu" onClick={() => setOpen(false)}>
          <div className="mobile-menu__panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu__header">
              <span className="mobile-menu__logo">Murascore</span>
              <button className="mobile-menu__close" onClick={() => setOpen(false)} aria-label="Закрыть меню">
                <X size={24} />
              </button>
            </div>
            <div className="mobile-menu__items">
              <button
                className={`mobile-menu__item ${activeTab === 'games' ? 'mobile-menu__item--active' : ''}`}
                onClick={() => handleNav(() => onTabChange('games'))}
              >
                <Gamepad2 size={22} /> ИГРЫ
              </button>
              <button
                className={`mobile-menu__item ${activeTab === 'posts' ? 'mobile-menu__item--active' : ''}`}
                onClick={() => handleNav(() => onTabChange('posts'))}
              >
                <Gamepad2 size={22} /> ПОСТЫ
              </button>
              <button
                className={`mobile-menu__item ${activeTab === 'mods' ? 'mobile-menu__item--active' : ''}`}
                onClick={() => handleNav(() => onTabChange('mods'))}
              >
                <Gamepad2 size={22} /> МОДЫ
              </button>
              <button
                className={`mobile-menu__item ${activeTab === 'forum' ? 'mobile-menu__item--active' : ''}`}
                onClick={() => handleNav(() => onTabChange('forum'))}
              >
                <Gamepad2 size={22} /> ФОРУМ
              </button>
              <button
                className={`mobile-menu__item ${activeTab === 'humor' ? 'mobile-menu__item--active' : ''}`}
                onClick={() => handleNav(() => onTabChange('humor'))}
              >
                <Gamepad2 size={22} /> ЮМОР
              </button>
              <button
                className={`mobile-menu__item ${activeTab === 'cheats' ? 'mobile-menu__item--active' : ''}`}
                onClick={() => handleNav(() => onTabChange('cheats'))}
              >
                <Gamepad2 size={22} /> ЧИТЫ
              </button>
              <button
                className={`mobile-menu__item ${activeTab === 'opinions' ? 'mobile-menu__item--active' : ''}`}
                onClick={() => handleNav(() => onTabChange('opinions'))}
              >
                <Gamepad2 size={22} /> МНЕНИЯ
              </button>
              <button
                className={`mobile-menu__item ${activeTab === 'music' ? 'mobile-menu__item--active' : ''}`}
                onClick={() => handleNav(() => onTabChange('music'))}
              >
                <Music size={22} /> МУЗЫКА
              </button>
              <button
                className={`mobile-menu__item ${activeTab === 'books' ? 'mobile-menu__item--active' : ''}`}
                onClick={() => handleNav(() => onTabChange('books'))}
              >
                <BookOpen size={22} /> КНИГИ
              </button>
              {currentUser && (
                <>
                  <button
                    className="mobile-menu__item"
                    onClick={() => handleNav(onOpenProfile)}
                  >
                    <User size={22} /> ПРОФИЛЬ
                  </button>
                  <button
                    className="mobile-menu__item"
                    onClick={() => handleNav(onOpenDM)}
                  >
                    <Mail size={22} /> ЛС
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
