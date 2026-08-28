import type { Game } from '../types';

interface Props {
  games: Game[];
  search: string;
  onSearchChange: (s: string) => void;
  onAddGame: () => void;
  onOpenGame: (id: string) => void;
}

export function GamesTab({ games, search, onSearchChange, onAddGame, onOpenGame }: Props) {
  const filtered = games.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="gamestab">
      <div className="gamestab__bar">
        <input
          className="gamestab__search"
          type="text"
          placeholder="ПОИСК ИГРЫ..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <button className="btn btn--accent" onClick={onAddGame}>
          ➕ ДОБАВИТЬ СВОЮ ИГРУ
        </button>
      </div>
      <div className="gamestab__grid">
        {filtered.map((game) => (
          <div
            key={game.id}
            className="gamecard gamecard--clickable"
            onClick={() => onOpenGame(game.id)}
          >
            {game.coverUrl ? (
              <img className="gamecard__cover" src={game.coverUrl} alt={game.name} />
            ) : (
              <div className="gamecard__cover gamecard__cover--placeholder">
                <span className="gamecard__goat">🤘</span>
              </div>
            )}
            <div className="gamecard__info">
              <span className="gamecard__name">{game.name}</span>
              <span className="gamecard__rating">★ {game.rating.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="feed__empty">ИГРЫ НЕ НАЙДЕНЫ</div>
      )}
    </div>
  );
}
