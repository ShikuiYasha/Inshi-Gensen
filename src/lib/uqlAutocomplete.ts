import type { FactorOption } from './factorOptions';

export type UqlSuggestion = {
  label: string;
  detail: string;
  replacement: string;
  start: number;
  end: number;
};

function findExpressionStart(text: string, cursorPosition: number): number {
  const beforeCursor = text.slice(0, cursorPosition);
  const lower = beforeCursor.toLowerCase();

  const boundaries = [0];

  const andIndex = lower.lastIndexOf(' and ');
  const orIndex = lower.lastIndexOf(' or ');
  const parenthesisIndex = lower.lastIndexOf('(');

  if (andIndex >= 0) {
    boundaries.push(andIndex + 5);
  }

  if (orIndex >= 0) {
    boundaries.push(orIndex + 4);
  }

  if (parenthesisIndex >= 0) {
    boundaries.push(parenthesisIndex + 1);
  }

  return Math.max(...boundaries);
}

function getCategoryLabel(option: FactorOption): string {
  switch (option.category) {
    case 'blue':
      return 'Blue';
    case 'pink':
      return 'Pink';
    case 'green':
      return 'Green';
    case 'race':
      return 'Race White';
    case 'skill':
      return 'Skill White';
    case 'scenario':
      return 'Scenario White';
  }
}

export function getUqlSuggestions(
  text: string,
  cursorPosition: number,
  options: FactorOption[],
  showAll: boolean = false,
): UqlSuggestion[] {
  const expressionStart = findExpressionStart(text, cursorPosition);

  const rawExpression = text.slice(expressionStart, cursorPosition);

  const leadingWhitespace = rawExpression.length - rawExpression.trimStart().length;

  const trimmedStart = expressionStart + leadingWhitespace;

  const expression = rawExpression.trim();

  const scopeMatch = expression.match(/^main\s+/i);
  const factorQuery = scopeMatch ? expression.slice(scopeMatch[0].length) : expression;

  const factorStart = scopeMatch ? trimmedStart + scopeMatch[0].length : trimmedStart;

  const exactOption = options.find(
    (option) => option.name.toLocaleLowerCase() === factorQuery.toLocaleLowerCase(),
  );

  if (exactOption) {
    return ['>=', '=', '>', '<=', '<', 'between'].map((operator) => ({
      label: operator,
      detail: operator === 'between' ? 'Star range' : 'Star comparison',
      replacement: operator === 'between' ? ' between 1 and 3' : ` ${operator} `,
      start: cursorPosition,
      end: cursorPosition,
    }));
  }

  const completedComparison = /(?:=|>=|>|<=|<)\s*\d+$|between\s+\d+\s+and\s+\d+$/i;

  if (completedComparison.test(expression)) {
    return [
      {
        label: 'and',
        detail: 'Require another condition',
        replacement: ' and ',
        start: cursorPosition,
        end: cursorPosition,
      },
      {
        label: 'or',
        detail: 'Allow either condition',
        replacement: ' or ',
        start: cursorPosition,
        end: cursorPosition,
      },
    ];
  }

  const normalizedQuery = factorQuery.trim().toLocaleLowerCase();
  if (!normalizedQuery && !showAll) {
    return [];
  }

  return options
    .filter((option) => {
      if (!normalizedQuery) {
        return true;
      }

      return option.name.toLocaleLowerCase().includes(normalizedQuery);
    })
    .sort((left, right) => {
      const leftStarts = left.name.toLocaleLowerCase().startsWith(normalizedQuery);

      const rightStarts = right.name.toLocaleLowerCase().startsWith(normalizedQuery);

      if (leftStarts !== rightStarts) {
        return leftStarts ? -1 : 1;
      }

      return left.factorBaseId - right.factorBaseId;
    })
    .slice(0, showAll ? options.length : 10)
    .map((option) => ({
      label: option.name,
      detail: getCategoryLabel(option),
      replacement: option.name,
      start: factorStart,
      end: cursorPosition,
    }));
}

export function applyUqlSuggestion(
  text: string,
  suggestion: UqlSuggestion,
): {
  text: string;
  cursorPosition: number;
} {
  const nextText =
    text.slice(0, suggestion.start) + suggestion.replacement + text.slice(suggestion.end);

  return {
    text: nextText,
    cursorPosition: suggestion.start + suggestion.replacement.length,
  };
}
export type UqlCaretPosition = {
  left: number;
  top: number;
  height: number;
};

const mirroredStyleProperties = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'lineHeight',
  'textTransform',
  'textIndent',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
] as const;

export function getUqlCaretPosition(textarea: HTMLTextAreaElement): UqlCaretPosition {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');

  mirror.style.position = 'fixed';
  mirror.style.left = '-9999px';
  mirror.style.top = '0';
  mirror.style.visibility = 'hidden';
  mirror.style.overflow = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.width = `${textarea.clientWidth}px`;

  for (const property of mirroredStyleProperties) {
    mirror.style[property] = style[property];
  }

  const beforeCaret = textarea.value.slice(0, textarea.selectionStart);

  mirror.textContent = beforeCaret;

  const marker = document.createElement('span');

  marker.textContent = '\u200b';
  mirror.append(marker);
  document.body.append(mirror);

  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;

  const position = {
    left: marker.offsetLeft - textarea.scrollLeft,
    top: marker.offsetTop - textarea.scrollTop,
    height: lineHeight,
  };

  mirror.remove();

  return position;
}
