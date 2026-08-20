import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react';
import type { DisplayParent } from '../lib/parentDisplay';
import type { StoredRental } from '../lib/parentStorage';

export type DisplayRental = {
  rental: StoredRental;
  parent: DisplayParent;
};

type RentalPickerProps = {
  isOpen: boolean;
  rentals: DisplayRental[];
  selectedParentId: string | null;
  onClose: () => void;
  onFetch: (accountId: string) => Promise<void>;
  onSelect: (parentId: string) => void;
  onRemove: (accountId: string) => Promise<void>;
};

export function RentalPicker({
  isOpen,
  rentals,
  selectedParentId,
  onClose,
  onFetch,
  onSelect,
  onRemove,
}: RentalPickerProps) {
  const [accountId, setAccountId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredRentals = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase();

    if (!search) {
      return rentals;
    }

    return rentals.filter(({ rental, parent }) =>
      [rental.accountId, rental.trainerName, parent.main.characterName, parent.main.outfitName]
        .join(' ')
        .toLocaleLowerCase()
        .includes(search),
    );
  }, [rentals, searchText]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  async function fetchAndSave(normalizedId: string): Promise<void> {
    try {
      setIsFetching(true);
      setError(null);
      await onFetch(normalizedId);
      setAccountId('');
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : 'The Rental could not be fetched.',
      );
    } finally {
      setIsFetching(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const normalizedId = accountId.replace(/\s/g, '');

    if (!/^\d{9,12}$/.test(normalizedId)) {
      setError('Enter a valid 9–12 digit Trainer UID.');
      return;
    }

    await fetchAndSave(normalizedId);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="picker-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section
        className="rental-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Select Rental Parent"
      >
        <header className="rental-picker__header">
          <div>
            <h2>Select Other Parent</h2>
            <span>Rental</span>
          </div>

          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <form className="rental-fetch" onSubmit={handleSubmit}>
          <label htmlFor="rental-account-id">Look up Rental by Trainer UID</label>

          <div>
            <input
              id="rental-account-id"
              inputMode="numeric"
              placeholder="9–12 digit Trainer UID"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            />

            <button type="submit" disabled={isFetching}>
              {isFetching ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
        </form>

        {error && (
          <p className="import-status import-status--error" role="alert">
            {error}
          </p>
        )}

        {rentals.length > 0 && (
          <input
            className="character-search"
            type="search"
            placeholder="Search saved Rentals…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        )}

        <div className="rental-list">
          {filteredRentals.map(({ rental, parent }) => {
            const selected = parent.trainedCharaId === selectedParentId;

            return (
              <article
                className={selected ? 'rental-card is-selected' : 'rental-card'}
                key={rental.accountId}
              >
                <button
                  className="rental-card__select"
                  type="button"
                  onClick={() => {
                    onSelect(parent.trainedCharaId);
                    onClose();
                  }}
                >
                  <div className="character-image">
                    <span aria-hidden="true">{parent.main.characterName.slice(0, 1)}</span>

                    <img
                      src={
                        `${import.meta.env.BASE_URL}` +
                        'character_thumbs/' +
                        parent.main.thumbnailFileName
                      }
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="rental-card__details">
                    <strong>{parent.main.characterName}</strong>
                    <span>{parent.main.outfitName}</span>
                    <span>
                      {rental.trainerName} · {rental.accountId}
                    </span>
                  </div>

                  {parent.rating !== null && (
                    <div className="rental-card__rating">
                      {parent.rankImageFileName && (
                        <img
                          src={
                            `${import.meta.env.BASE_URL}` +
                            'rank_images/' +
                            parent.rankImageFileName
                          }
                          alt=""
                          loading="lazy"
                        />
                      )}

                      <strong>{parent.rating.toLocaleString()}</strong>
                    </div>
                  )}
                </button>

                <div className="rental-card__actions">
                  <button
                    className="rental-card__refresh"
                    type="button"
                    disabled={isFetching}
                    onClick={() => void fetchAndSave(rental.accountId)}
                  >
                    Refresh
                  </button>

                  <button
                    className="rental-card__remove"
                    type="button"
                    onClick={() => void onRemove(rental.accountId)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}

          {rentals.length === 0 && (
            <div className="rental-picker__empty">
              <strong>No saved Rentals yet</strong>
              <span>Enter a Trainer UID above to fetch and save their Rental Parent.</span>
            </div>
          )}

          {rentals.length > 0 && filteredRentals.length === 0 && (
            <div className="rental-picker__empty">
              <strong>No matching Rentals</strong>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
