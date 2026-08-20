import { useState } from 'react';
import { AffinityBreakdown, type AffinityBreakdownMode } from './AffinityBreakdown';
import type { CharacterAffinityBreakdown, RaceAffinityBreakdown } from '../lib/affinity';
import {
  getTotalWhiteCount,
  type DisplayFactor,
  type DisplayParent,
  type FactorCategory,
  type LineageMember,
} from '../lib/parentDisplay';

type ParentCardProps = {
  parent: DisplayParent;
  raceAffinity: number;
  totalAffinity?: number;
  isOtherParent: boolean;
  onToggleOtherParent: () => void;
  raceBreakdown: RaceAffinityBreakdown;
  characterBreakdown?: CharacterAffinityBreakdown;
};

const factorSectionLabels: Partial<Record<FactorCategory, string>> = {
  skill: 'Skill Whites',
  race: 'Race Whites',
  scenario: 'Scenario Whites',
  event: 'Event Sparks',
};

function FactorPill({ factor }: { factor: DisplayFactor }) {
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
function LineagePortrait({ member }: { member: LineageMember }) {
  const imageUrl = `${import.meta.env.BASE_URL}character_thumbs/` + member.thumbnailFileName;

  return (
    <div className="lineage__portrait">
      <span aria-hidden="true">{member.characterName.slice(0, 1)}</span>

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

export function ParentCard({
  parent,
  raceAffinity,
  totalAffinity,
  raceBreakdown,
  characterBreakdown,
  isOtherParent,
  onToggleOtherParent,
}: ParentCardProps) {
  const [breakdownMode, setBreakdownMode] = useState<AffinityBreakdownMode | null>(null);

  function toggleBreakdown(mode: AffinityBreakdownMode) {
    setBreakdownMode((currentMode) => (currentMode === mode ? null : mode));
  }
  const outfitTitle = parent.main.outfitName.replace(parent.main.characterName, '').trim();
  const totalWhiteCount = getTotalWhiteCount(parent);

  const primaryFactors = parent.factors.filter((factor) =>
    ['blue', 'pink', 'green'].includes(factor.category),
  );

  const separatedCategories: FactorCategory[] = ['skill', 'race', 'scenario', 'event'];

  return (
    <article className="parent-card">
      <header className="parent-card__header">
        <div>
          <h3>{parent.main.characterName}</h3>

          {outfitTitle && <p className="parent-card__outfit">{outfitTitle}</p>}
          {parent.rating !== null && (
            <div className="parent-card__rating">
              {parent.rankImageFileName && (
                <img
                  src={`${import.meta.env.BASE_URL}rank_images/` + parent.rankImageFileName}
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              )}

              <strong>{parent.rating.toLocaleString()}</strong>
            </div>
          )}
        </div>

        <button
          className={isOtherParent ? 'other-parent-button is-selected' : 'other-parent-button'}
          type="button"
          onClick={onToggleOtherParent}
        >
          {isOtherParent ? 'Clear Other Parent' : 'Set as Other Parent'}
        </button>

        <div className="parent-card__metrics">
          <button
            type="button"
            disabled={!characterBreakdown}
            onClick={() => toggleBreakdown('total')}
          >
            <strong>{totalAffinity ?? '—'}</strong>
            <span>Total Affinity</span>
            <span aria-hidden="true">{breakdownMode === 'total' ? '▲' : '▼'}</span>
          </button>

          <button type="button" onClick={() => toggleBreakdown('race')}>
            <strong>{raceAffinity}</strong>
            <span>Race Affinity</span>
            <span aria-hidden="true">{breakdownMode === 'race' ? '▲' : '▼'}</span>
          </button>

          <div>
            <strong>{totalWhiteCount}</strong>
            <span>Total Whites</span>
          </div>
        </div>
      </header>

      {breakdownMode && (
        <AffinityBreakdown
          mode={breakdownMode}
          race={raceBreakdown}
          character={characterBreakdown}
        />
      )}

      <div className="parent-card__body">
        <aside className="lineage">
          <div className="lineage__member lineage__member--main">
            <LineagePortrait member={parent.main} />
            <span>{parent.main.characterName}</span>
          </div>

          <div className="lineage__grandparents">
            {parent.grandparents.map((grandparent, index) => (
              <div className="lineage__member" key={`${grandparent.cardId}-${index}`}>
                <LineagePortrait member={grandparent} />
                <span>{grandparent.characterName}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="factor-groups">
          {primaryFactors.length > 0 && (
            <div className="factor-group factor-group--primary">
              <div className="factor-list">
                {primaryFactors.map((factor) => (
                  <FactorPill factor={factor} key={`${factor.category}-${factor.name}`} />
                ))}
              </div>
            </div>
          )}

          {separatedCategories.map((category) => {
            const factors = parent.factors.filter((factor) => factor.category === category);

            if (factors.length === 0) {
              return null;
            }

            return (
              <section className="factor-group" key={category}>
                <h4>{factorSectionLabels[category]}</h4>

                <div className="factor-list">
                  {factors.map((factor) => (
                    <FactorPill factor={factor} key={`${factor.category}-${factor.name}`} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </article>
  );
}
