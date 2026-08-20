import type {
  AffinityParticipant,
  CharacterAffinityBreakdown,
  RaceAffinityBreakdown,
} from '../lib/affinity';

export type AffinityBreakdownMode = 'total' | 'race';

type AffinityBreakdownProps = {
  mode: AffinityBreakdownMode;
  race: RaceAffinityBreakdown;
  character?: CharacterAffinityBreakdown;
};

function Participant({ participant }: { participant: AffinityParticipant }) {
  const imageUrl = participant.thumbnailFileName
    ? `${import.meta.env.BASE_URL}character_thumbs/` + participant.thumbnailFileName
    : null;

  return (
    <div className="affinity-participant">
      <div className="affinity-participant__image">
        <span aria-hidden="true">{participant.characterName.slice(0, 1)}</span>

        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      <span className="affinity-participant__label">{participant.label}</span>

      <span className="affinity-participant__name">{participant.characterName}</span>
    </div>
  );
}

function ParticipantStrip({ participants }: { participants: AffinityParticipant[] }) {
  return (
    <div className="affinity-participants">
      {participants.map((participant, index) => (
        <Participant participant={participant} key={`${participant.label}-${index}`} />
      ))}
    </div>
  );
}

export function AffinityBreakdown({ mode, race, character }: AffinityBreakdownProps) {
  const showCharacter = mode === 'total' && character;
  const totalAffinity = (character?.total ?? 0) + race.total;

  return (
    <section className="affinity-breakdown">
      <h4>{mode === 'race' ? 'Race Affinity Breakdown' : 'Total Affinity Breakdown'}</h4>

      {showCharacter && (
        <div className="affinity-breakdown__section">
          <h5>Character Affinity</h5>

          <div className="affinity-contributions">
            {character.contributions.map((contribution, index) => (
              <div className="affinity-contribution" key={`${contribution.label}-${index}`}>
                <div className="affinity-contribution__header">
                  <span>{contribution.label}</span>
                  <strong>{contribution.points} pts</strong>
                </div>

                <ParticipantStrip participants={contribution.participants} />
              </div>
            ))}
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
          <details className="race-comparison" key={`${comparison.label}-${index}`}>
            <summary>
              <div className="race-comparison__summary">
                <ParticipantStrip participants={comparison.participants} />

                <span>{comparison.label}</span>
              </div>

              <div className="race-comparison__score">
                <strong>{comparison.points} pts</strong>
                <span className="race-comparison__chevron" aria-hidden="true">
                  ▼
                </span>
              </div>
            </summary>

            <div className="race-comparison__matches">
              {comparison.matches.length > 0 ? (
                comparison.matches.map((match) => (
                  <div className="affinity-breakdown__row" key={match.groupId}>
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
