import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from 'react';
import type { CharacterOption } from '../lib/characterOptions';

type CharacterPickerProps = {
  label: string;
  options: CharacterOption[];
  value: number | null;
  onChange: (characterId: number | null) => void;
};

function CharacterImage({
  character,
}: {
  character: CharacterOption;
}) {
  const imageUrl =
    `${import.meta.env.BASE_URL}character_thumbs/` +
    character.thumbnailFileName;

  return (
    <div className="character-image">
      <span aria-hidden="true">{character.name.slice(0, 1)}</span>

      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}

export function CharacterPicker({
  label,
  options,
  value,
  onChange,
}: CharacterPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedCharacter =
    options.find((option) => option.characterId === value) ?? null;

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) =>
      option.name.toLocaleLowerCase().includes(normalizedSearch),
    );
  }, [options, searchText]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function chooseCharacter(characterId: number) {
    onChange(characterId);
    setIsOpen(false);
    setSearchText('');
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      setIsOpen(false);
    }
  }

  return (
    <>
      <button
        className="character-picker-button"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        {selectedCharacter ? (
          <>
            <CharacterImage character={selectedCharacter} />
            <span>{selectedCharacter.name}</span>
          </>
        ) : (
          <>
            <span className="character-picker-button__add">+</span>
            <span>{label}</span>
          </>
        )}
      </button>

      {selectedCharacter && (
        <button
          className="character-picker-clear"
          type="button"
          onClick={() => onChange(null)}
        >
          Clear {label}
        </button>
      )}

      {isOpen && (
        <div
          className="picker-backdrop"
          role="presentation"
          onMouseDown={handleBackdropClick}
        >
          <section
            className="character-picker-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={label}
          >
            <header className="character-picker-dialog__header">
              <h2>{label}</h2>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </header>

            <input
              className="character-search"
              type="search"
              placeholder="Search by name…"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              autoFocus
            />

            <div className="character-grid">
              {filteredOptions.map((character) => (
                <button
                  className={
                    character.characterId === value
                      ? 'character-option is-selected'
                      : 'character-option'
                  }
                  type="button"
                  key={character.characterId}
                  onClick={() =>
                    chooseCharacter(character.characterId)
                  }
                >
                  <CharacterImage character={character} />
                  <span>{character.name}</span>
                </button>
              ))}
            </div>

            {filteredOptions.length === 0 && (
              <p className="character-picker-empty">
                No matching characters found.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}