export type VideoLabTokenizedLine = {
  raw: string;
  line: string;
  lineNumber: number;
  tokens: string[];
  isEmpty: boolean;
  isComment: boolean;
};

export function tokenizeVideoLabSource(source: string): VideoLabTokenizedLine[] {
  return source.split(/\r?\n/).map((raw, index) => tokenizeVideoLabLine(raw, index + 1));
}

export function tokenizeVideoLabLine(raw: string, lineNumber: number): VideoLabTokenizedLine {
  const line = stripInlineComment(raw).trim();
  const isEmpty = line.length === 0;
  const isComment = raw.trim().startsWith("#") || raw.trim().startsWith("//");

  return {
    raw,
    line,
    lineNumber,
    tokens: isEmpty || isComment ? [] : tokenize(line),
    isEmpty,
    isComment,
  };
}

export function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let bracketDepth = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if ((char === '"' || char === "'") && quote === null) {
      quote = char;
      current += char;
      continue;
    }

    if (char === quote) {
      quote = null;
      current += char;
      continue;
    }

    if (quote === null) {
      if (char === "[") {
        bracketDepth += 1;
        current += char;
        continue;
      }

      if (char === "]") {
        bracketDepth = Math.max(0, bracketDepth - 1);
        current += char;
        continue;
      }

      if (/\s/.test(char) && bracketDepth === 0) {
        pushToken(tokens, current);
        current = "";
        continue;
      }
    }

    current += char;
  }

  pushToken(tokens, current);

  return tokens.map(unquoteToken);
}

export function stripInlineComment(line: string): string {
  let quote: "'" | '"' | null = null;
  let bracketDepth = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if ((char === '"' || char === "'") && quote === null) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = null;
      continue;
    }

    if (quote !== null) continue;

    if (char === "[") {
      bracketDepth += 1;
      continue;
    }

    if (char === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (bracketDepth > 0) continue;

    if (char === "#") {
      return line.slice(0, index);
    }

    if (char === "/" && next === "/") {
      return line.slice(0, index);
    }
  }

  return line;
}

export function commandOf(tokens: string[]): string | undefined {
  return tokens[0];
}

export function hasToken(tokens: string[], token: string): boolean {
  return tokens.includes(token);
}

export function tokenAfter(tokens: string[], token: string): string | undefined {
  const index = tokens.indexOf(token);
  if (index < 0) return undefined;
  return tokens[index + 1];
}

export function tokensAfter(tokens: string[], token: string): string[] {
  const index = tokens.indexOf(token);
  if (index < 0) return [];
  return tokens.slice(index + 1);
}

export function tokensBetween(tokens: string[], startToken: string, endToken: string): string[] {
  const start = tokens.indexOf(startToken);
  const end = tokens.indexOf(endToken);

  if (start < 0) return [];
  if (end < 0 || end <= start) return tokens.slice(start + 1);

  return tokens.slice(start + 1, end);
}

export function joinedAfter(tokens: string[], token: string): string {
  return tokensAfter(tokens, token).join(" ");
}

export function joinedFrom(tokens: string[], start: number): string {
  return tokens.slice(start).join(" ");
}

function pushToken(tokens: string[], value: string): void {
  const trimmed = value.trim();

  if (trimmed.length > 0) {
    tokens.push(trimmed);
  }
}

function unquoteToken(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}