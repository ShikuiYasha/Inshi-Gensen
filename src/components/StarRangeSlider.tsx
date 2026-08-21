type StarRangeSliderProps = {
  minimum: number;
  maximum: number;
  limit: number;
  onChange: (minimum: number, maximum: number) => void;
};

export function StarRangeSlider({ minimum, maximum, limit, onChange }: StarRangeSliderProps) {
  const denominator = Math.max(limit - 1, 1);
  const left = ((minimum - 1) / denominator) * 100;
  const right = 100 - ((maximum - 1) / denominator) * 100;

  return (
    <div className="star-range">
      <div className="star-range__controls">
        <div className="star-range__track">
          <span
            style={{
              left: `${left}%`,
              right: `${right}%`,
            }}
          />
        </div>

        <input
          type="range"
          min="1"
          max={limit}
          value={minimum}
          aria-label="Minimum stars"
          onChange={(event) => {
            const nextMinimum = Math.min(Number(event.target.value), maximum);

            onChange(nextMinimum, maximum);
          }}
        />

        <input
          type="range"
          min="1"
          max={limit}
          value={maximum}
          aria-label="Maximum stars"
          onChange={(event) => {
            const nextMaximum = Math.max(Number(event.target.value), minimum);

            onChange(minimum, nextMaximum);
          }}
        />
      </div>

      <div
        className="star-range__labels"
        style={{
          gridTemplateColumns: `repeat(${limit}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: limit }, (_, index) => index + 1).map((stars) => (
          <span className={stars >= minimum && stars <= maximum ? 'is-selected' : ''} key={stars}>
            {stars}★
          </span>
        ))}
      </div>
    </div>
  );
}
