import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from 'react';
import type { CharacterOption } from '../lib/characterOptions';

type CharacterMultiPickerProps = {
  label: string;
  options: CharacterOption[];
  values: number[];
  tone: 'allow' | 'hide';
  onChange: (values: number[]) => void;
};

function CharacterThumbnail({
  character,
}: {
  character: CharacterOption;
}) {
  const imageUrl =
    `${import.meta.env.BASE_URL}character_thumbs/` +
    character.thumbnailFileName;

  return (
    <div className="filter-character-image">
      <span aria-hidden="true">
        {character.name.slice(0, 1)}
      </span>

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

export function CharacterMultiPicker({
  label,
  options,
  values,
  tone,
  onChange,
}: CharacterMultiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedOptions = values.flatMap((cardId) => {
    const option = options.find(
      (candidate) => candidate.cardId === cardId,
    );

    return option ? [option] : [];
  });

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) =>
      `${option.name} ${option.outfitTitle}`
        .toLocaleLowerCase()
        .includes(normalizedSearch),
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

  function toggleCharacter(cardId: number) {
    if (values.includes(cardId)) {
      onChange(values.filter((value) => value !== cardId));
      return;
    }

    onChange([...values, cardId]);
  }

  function removeCharacter(cardId: number) {
    onChange(values.filter((value) => value !== cardId));
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      setIsOpen(false);
    }
  }

  return (
    <div className={`character-multi character-multi--${tone}`}>
      <button
        className="character-multi__add"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <span>{tone === 'allow' ? '+' : '−'}</span>
        {label}
      </button>

      {selectedOptions.length > 0 && (
        <div className="character-multi__chips">
          {selectedOptions.map((character) => (
            <div
              className="character-filter-chip"
              key={character.cardId}
            >
              <CharacterThumbnail character={character} />

              <span>
                {character.name} {character.outfitTitle}
              </span>

              <button
                type="button"
                aria-label={`Remove ${character.name} ${character.outfitTitle}`}
                onClick={() =>
                  removeCharacter(character.cardId)
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
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
              <div>
                <h2>{label}</h2>
                <p>{values.length} selected</p>
              </div>

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
              placeholder="Search by name or outfit…"
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              autoFocus
            />

            <div className="character-grid">
              {filteredOptions.map((character) => {
                const isSelected = values.includes(
                  character.cardId,
                );

                return (
                  <button
                    className={
                      isSelected
                        ? `character-option is-selected is-${tone}`
                        : 'character-option'
                    }
                    type="button"
                    key={character.cardId}
                    onClick={() =>
                      toggleCharacter(character.cardId)
                    }
                  >
                    <CharacterThumbnail character={character} />
                    <span>{character.name}</span>
                    <span className="character-option__outfit">
                      {character.outfitTitle}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              className="character-multi__done"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </section>
        </div>
      )}
    </div>
  );
}