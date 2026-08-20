import type {
  CharacterAffinityBreakdown,
  RaceAffinityBreakdown,
} from '../lib/affinity';

export type AffinityBreakdownMode = 'total' | 'race';

type AffinityBreakdownProps = {
  mode: AffinityBreakdownMode;
  race: RaceAffinityBreakdown;
  character?: CharacterAffinityBreakdown;
};

export function AffinityBreakdown({
  mode,
  race,
  character,
}: AffinityBreakdownProps) {
  const showCharacter = mode === 'total' && character;
  const totalAffinity =
    (character?.total ?? 0) + race.total;

  return (
    <section className="affinity-breakdown">
      <h4>
        {mode === 'race'
          ? 'Race Affinity Breakdown'
          : 'Total Affinity Breakdown'}
      </h4>

      {showCharacter && (
        <div className="affinity-breakdown__section">
          <h5>Character Affinity</h5>

          <div className="affinity-breakdown__rows">
            {character.contributions.map(
              (contribution, index) => (
                <div
                  className="affinity-breakdown__row"
                  key={`${contribution.label}-${index}`}
                >
                  <span>{contribution.label}</span>
                  <strong>+{contribution.points}</strong>
                </div>
              ),
            )}
          </div>

          <div className="affinity-breakdown__subtotal">
            <span>Character Affinity subtotal</span>
            <strong>{character.total}</strong>
          </div>
        </div>
      )}

      <div className="affinity-breakdown__section">
        <h5>Race Affinity</h5>

        {race.comparisons.map((comparison, index) => (
          <details
            className="race-comparison"
            key={`${comparison.label}-${index}`}
          >
            <summary>
              <span>{comparison.label}</span>
              <strong>{comparison.points}</strong>
            </summary>

            <div className="race-comparison__matches">
              {comparison.matches.length > 0 ? (
                comparison.matches.map((match) => (
                  <div
                    className="affinity-breakdown__row"
                    key={match.groupId}
                  >
                    <span>{match.raceName}</span>
                    <strong>+{match.points}</strong>
                  </div>
                ))
              ) : (
                <p>No shared G1 race groups.</p>
              )}
            </div>
          </details>
        ))}

        <div className="affinity-breakdown__subtotal">
          <span>Race Affinity subtotal</span>
          <strong>{race.total}</strong>
        </div>
      </div>

      {mode === 'total' && character && (
        <div className="affinity-breakdown__total">
          <span>
            {character.total} Character + {race.total} Race
          </span>
          <strong>{totalAffinity} Total Affinity</strong>
        </div>
      )}
    </section>
  );
}