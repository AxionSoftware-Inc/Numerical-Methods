export type ScalarExpressionContext = Record<string, number>;

export type CompiledScalarExpression = {
  source: string;
  normalizedSource: string;
  evaluate(context?: ScalarExpressionContext): number;
};

export type CustomFormulaAnalysis = {
  source: string;
  normalizedText: string;
  normalizedExpression: string;
  statements: string[];
  assignments: Record<string, number>;
  assignmentSources: Record<string, string>;
  keywords: string[];
  symbols: string[];
};

const SAFE_FUNCTIONS: Record<string, (...values: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  abs: Math.abs,
  sqrt: Math.sqrt,
  exp: Math.exp,
  log: Math.log,
  ln: Math.log,
  min: Math.min,
  max: Math.max,
};

const SAFE_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

const LATEX_ALIASES: Array<[RegExp, string]> = [
  [/\\cdot/g, "*"],
  [/\\times/g, "*"],
  [/\\pi/g, "pi"],
  [/\\theta/g, "theta"],
  [/\\eta/g, "eta"],
  [/\\omega/g, "omega"],
  [/\\alpha/g, "alpha"],
  [/\\beta/g, "beta"],
  [/\\gamma/g, "gamma"],
  [/\\lambda/g, "lambda"],
  [/\\mu/g, "mu"],
  [/\\sigma/g, "sigma"],
  [/\\rho/g, "rho"],
  [/\\tau/g, "tau"],
  [/\\Delta/g, "delta"],
  [/\\delta/g, "delta"],
  [/\\xi/g, "xi"],
  [/\\nabla/g, "grad"],
  [/\\partial/g, "partial"],
  [/\\left/g, ""],
  [/\\right/g, ""],
  [/\\,/g, " "],
  [/\\;/g, ";"],
];

const ASSIGNMENT_PREFIXES = [
  "theta",
  "eta",
  "omega",
  "alpha",
  "beta",
  "gamma",
  "lambda",
  "mu",
  "sigma",
  "rho",
  "tau",
  "delta",
  "step",
  "lr",
  "learningrate",
  "a2",
  "b1",
  "b2",
  "c2",
  "relaxation",
  "momentum",
  "correction",
  "noisecorrection",
];

export function compileScalarExpression(source: string): CompiledScalarExpression {
  const normalizedSource = normalizeFormulaExpression(source);

  return {
    source,
    normalizedSource,
    evaluate(context = {}) {
      const parser = new ExpressionParser(tokenizeExpression(normalizedSource), context);
      const value = parser.parseExpression();
      if (!parser.isDone()) {
        throw new Error(`Unexpected token "${parser.peek()?.value ?? ""}" in expression "${source}".`);
      }
      return value;
    },
  };
}

export function analyzeCustomFormula(source: string): CustomFormulaAnalysis {
  const normalizedText = normalizeFormulaText(source);
  const statements = splitStatements(normalizedText);
  const assignments: Record<string, number> = {};
  const assignmentSources: Record<string, string> = {};
  const keywords = Array.from(new Set((normalizedText.match(/[a-z][a-z0-9-]*/g) ?? []).filter((token) => token.length > 1)));
  const symbols = Array.from(new Set((normalizeFormulaExpression(source).match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []).map(normalizeIdentifier)));

  for (const statement of statements) {
    const assignment = parseAssignment(statement, assignments);
    if (!assignment) continue;
    assignmentSources[assignment.key] = assignment.expression;
    if (assignment.value !== undefined) {
      assignments[assignment.key] = assignment.value;
    }
  }

  return {
    source,
    normalizedText,
    normalizedExpression: normalizeFormulaExpression(source),
    statements,
    assignments,
    assignmentSources,
    keywords,
    symbols,
  };
}

export function lookupAssignment(
  analysis: CustomFormulaAnalysis,
  labels: string[],
): number | undefined {
  for (const label of labels) {
    const normalized = normalizeIdentifier(label);
    if (normalized in analysis.assignments) {
      return analysis.assignments[normalized];
    }
  }

  for (const [rawKey, value] of Object.entries(analysis.assignments)) {
    if (labels.some((label) => rawKey.startsWith(normalizeIdentifier(label)))) {
      return value;
    }
  }

  return undefined;
}

export function lookupAssignmentSource(
  analysis: CustomFormulaAnalysis,
  labels: string[],
): string | undefined {
  for (const label of labels) {
    const normalized = normalizeIdentifier(label);
    if (normalized in analysis.assignmentSources) {
      return analysis.assignmentSources[normalized];
    }
  }

  for (const [rawKey, value] of Object.entries(analysis.assignmentSources)) {
    if (labels.some((label) => rawKey.startsWith(normalizeIdentifier(label)))) {
      return value;
    }
  }

  return undefined;
}

export function includesKeyword(analysis: CustomFormulaAnalysis, token: string) {
  const normalized = normalizeIdentifier(token).replace(/_/g, "");
  return analysis.normalizedText.replace(/\s+/g, "").includes(normalized);
}

function splitStatements(text: string) {
  return text
    .split(/[\n;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseAssignment(statement: string, knownAssignments: Record<string, number>) {
  const match = statement.match(/^([a-zA-Z][a-zA-Z0-9_\-]*)\s*(?:=|:)\s*(.+)$/);
  if (!match) return null;

  const key = normalizeIdentifier(match[1]!);
  const expression = match[2]!.trim();
  if (!shouldTreatAsParameter(key, expression)) return null;

  try {
    const value = compileScalarExpression(expression).evaluate(knownAssignments);
    if (!Number.isFinite(value)) {
      return shouldKeepSymbolicAssignment(key) ? { key, expression, value: undefined } : null;
    }
    return { key, expression, value };
  } catch {
    return shouldKeepSymbolicAssignment(key) ? { key, expression, value: undefined } : null;
  }
}

function shouldTreatAsParameter(key: string, expression: string) {
  if (ASSIGNMENT_PREFIXES.some((prefix) => key === prefix || key.startsWith(`${prefix}_`))) {
    return true;
  }

  if (shouldKeepSymbolicAssignment(key)) return true;
  if (/^[a-z]\d+$/.test(key)) return true;
  return /^[0-9a-zA-Z_+\-*/().,\s]+$/.test(expression);
}

function shouldKeepSymbolicAssignment(key: string) {
  return ["xnext", "ynext", "znext", "vnext"].includes(key);
}

function normalizeFormulaText(source: string) {
  let value = normalizeStateAliases(source);
  for (const [pattern, replacement] of LATEX_ALIASES) {
    value = value.replace(pattern, replacement);
  }

  return value
    .toLowerCase()
    .replace(/[{}[\]]/g, " ")
    .replace(/_/g, "")
    .replace(/\^/g, " ")
    .replace(/\\/g, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFormulaExpression(source: string) {
  let value = normalizeStateAliases(source);
  for (const [pattern, replacement] of LATEX_ALIASES) {
    value = value.replace(pattern, replacement);
  }

  return value
    .trim()
    .replaceAll("π", "pi")
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "(($1)/($2))")
    .replace(/\^/g, "**")
    .replace(/[{}]/g, "")
    .replace(/_/g, "")
    .replace(/\s+/g, "");
}

function normalizeIdentifier(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeStateAliases(source: string) {
  return source
    .replace(/x_\{\s*[kn]\s*\+\s*1\s*\}/gi, "xnext")
    .replace(/y_\{\s*[kn]\s*\+\s*1\s*\}/gi, "ynext")
    .replace(/z_\{\s*[kn]\s*\+\s*1\s*\}/gi, "znext")
    .replace(/v_\{\s*[kn]\s*\+\s*1\s*\}/gi, "vnext")
    .replace(/x_\(\s*[kn]\s*\+\s*1\s*\)/gi, "xnext")
    .replace(/y_\(\s*[kn]\s*\+\s*1\s*\)/gi, "ynext")
    .replace(/z_\(\s*[kn]\s*\+\s*1\s*\)/gi, "znext")
    .replace(/v_\(\s*[kn]\s*\+\s*1\s*\)/gi, "vnext")
    .replace(/x\^\{\s*[kn]\s*\+\s*1\s*\}/gi, "xnext")
    .replace(/y\^\{\s*[kn]\s*\+\s*1\s*\}/gi, "ynext")
    .replace(/z\^\{\s*[kn]\s*\+\s*1\s*\}/gi, "znext")
    .replace(/v\^\{\s*[kn]\s*\+\s*1\s*\}/gi, "vnext");
}

type TokenKind = "number" | "identifier" | "operator" | "paren" | "comma";

type Token = {
  kind: TokenKind;
  value: string;
};

function tokenizeExpression(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index]!;

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let value = char;
      index += 1;
      while (index < source.length && /[0-9.]/.test(source[index]!)) {
        value += source[index]!;
        index += 1;
      }
      tokens.push({ kind: "number", value });
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let value = char;
      index += 1;
      while (index < source.length && /[a-zA-Z0-9_]/.test(source[index]!)) {
        value += source[index]!;
        index += 1;
      }
      tokens.push({ kind: "identifier", value });
      continue;
    }

    if (char === "*" && source[index + 1] === "*") {
      tokens.push({ kind: "operator", value: "**" });
      index += 2;
      continue;
    }

    if ("+-*/".includes(char)) {
      tokens.push({ kind: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ kind: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ kind: "comma", value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported character "${char}" in expression "${source}".`);
  }

  return tokens;
}

class ExpressionParser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly context: ScalarExpressionContext,
  ) {}

  parseExpression(): number {
    return this.parseAdditive();
  }

  isDone(): boolean {
    return this.index >= this.tokens.length;
  }

  peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private consume(): Token | undefined {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative();

    while (this.peek()?.kind === "operator" && (this.peek()?.value === "+" || this.peek()?.value === "-")) {
      const operator = this.consume()!.value;
      const right = this.parseMultiplicative();
      value = operator === "+" ? value + right : value - right;
    }

    return value;
  }

  private parseMultiplicative(): number {
    let value = this.parsePower();

    while (this.peek()?.kind === "operator" && (this.peek()?.value === "*" || this.peek()?.value === "/")) {
      const operator = this.consume()!.value;
      const right = this.parsePower();
      value = operator === "*" ? value * right : value / right;
    }

    return value;
  }

  private parsePower(): number {
    let value = this.parseUnary();

    if (this.peek()?.kind === "operator" && this.peek()?.value === "**") {
      this.consume();
      const exponent = this.parsePower();
      value = value ** exponent;
    }

    return value;
  }

  private parseUnary(): number {
    if (this.peek()?.kind === "operator" && this.peek()?.value === "+") {
      this.consume();
      return this.parseUnary();
    }

    if (this.peek()?.kind === "operator" && this.peek()?.value === "-") {
      this.consume();
      return -this.parseUnary();
    }

    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.consume();
    if (!token) throw new Error("Unexpected end of expression.");

    if (token.kind === "number") {
      const value = Number(token.value);
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number "${token.value}".`);
      }
      return value;
    }

    if (token.kind === "identifier") {
      return this.parseIdentifier(token.value);
    }

    if (token.kind === "paren" && token.value === "(") {
      const value = this.parseExpression();
      const closing = this.consume();
      if (!closing || closing.kind !== "paren" || closing.value !== ")") {
        throw new Error("Missing closing parenthesis.");
      }
      return value;
    }

    throw new Error(`Unexpected token "${token.value}".`);
  }

  private parseIdentifier(name: string): number {
    const normalized = normalizeIdentifier(name);

    if (this.peek()?.kind === "paren" && this.peek()?.value === "(") {
      this.consume();
      const args: number[] = [];
      if (!(this.peek()?.kind === "paren" && this.peek()?.value === ")")) {
        while (true) {
          args.push(this.parseExpression());
          if (this.peek()?.kind === "comma") {
            this.consume();
            continue;
          }
          break;
        }
      }
      const closing = this.consume();
      if (!closing || closing.kind !== "paren" || closing.value !== ")") {
        throw new Error(`Missing closing parenthesis after function "${name}".`);
      }
      const fn = SAFE_FUNCTIONS[normalized];
      if (!fn) {
        throw new Error(`Unsupported function "${name}".`);
      }
      return fn(...args);
    }

    if (normalized in this.context) {
      return this.context[normalized]!;
    }

    if (normalized in SAFE_CONSTANTS) {
      return SAFE_CONSTANTS[normalized]!;
    }

    throw new Error(`Unknown symbol "${name}".`);
  }
}
