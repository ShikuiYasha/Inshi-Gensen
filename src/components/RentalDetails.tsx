import type {
  DisplayFactor,
  DisplayParent,
  FactorCategory,
  LineageMember,
} from '../lib/parentDisplay';

type RentalDetailsProps = {
  parent: DisplayParent;
};

const sectionLabels: Partial<Record<FactorCategory, string>> = {
  skill: 'Skill Whites',
  race: 'Race Whites',
  scenario: 'Scenario Whites',
  event: 'Event Sparks',
};

function RentalPortrait({ member, label }: { member: LineageMember; label: string }) {
  return (
    <div className="rental-details__member">
      <span className="rental-details__member-label">{label}</span>

      <div className="lineage__portrait">
        <span aria-hidden="true">{member.characterName.slice(0, 1)}</span>

        <img
          src={`${import.meta.env.BASE_URL}character_thumbs/` + member.thumbnailFileName}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      </div>

      <span className="rental-details__member-name">{member.characterName}</span>
    </div>
  );
}

function RentalFactorPill({ factor }: { factor: DisplayFactor }) {
  return (
    <span className={`factor-pill factor-pill--${factor.category}`}>
      <span>
        {factor.totalStars}★ {factor.name}
      </span>

      {factor.mainStars > 0 && (
        <span className="factor-pill__main">({factor.mainStars}★ Main)</span>
      )}
    </span>
  );
}

export function RentalDetails({ parent }: RentalDetailsProps) {
  const primaryFactors = parent.factors.filter((factor) =>
    ['blue', 'pink', 'green'].includes(factor.category),
  );

  const separatedCategories: FactorCategory[] = ['skill', 'race', 'scenario', 'event'];

  return (
    <div className="rental-details">
      <div className="rental-details__lineage">
        <RentalPortrait member={parent.main} label="Parent" />

        {parent.grandparents.map((grandparent, index) => (
          <RentalPortrait
            key={`${grandparent.cardId}-${index}`}
            member={grandparent}
            label={`GP${index + 1}`}
          />
        ))}
      </div>

      <div className="rental-details__factors">
        {primaryFactors.length > 0 && (
          <div className="rental-details__factor-list">
            {primaryFactors.map((factor) => (
              <RentalFactorPill key={`${factor.category}-${factor.factorBaseId}`} factor={factor} />
            ))}
          </div>
        )}

        {separatedCategories.map((category) => {
          const factors = parent.factors.filter((factor) => factor.category === category);

          if (factors.length === 0) {
            return null;
          }

          return (
            <section className="rental-details__factor-section" key={category}>
              <h3>{sectionLabels[category]}</h3>

              <div className="rental-details__factor-list">
                {factors.map((factor) => (
                  <RentalFactorPill
                    key={`${factor.category}-${factor.factorBaseId}`}
                    factor={factor}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
