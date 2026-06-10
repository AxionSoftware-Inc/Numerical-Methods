export type MathExpressionContext = {
  x?: number;
  y?: number;
  t?: number;
};

export type CompiledMathExpression = {
  source: string;
  evaluate(context: MathExpressionContext): number;
};

const SAFE_FUNCTIONS: Record<string, (value: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  abs: Math.abs,
  sqrt: Math.sqrt,
  exp: Math.exp,
  log: Math.log,
  ln: Math.log,
};

const SAFE_CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

export function compileMathExpression(source: string): CompiledMathExpression {
  const normalized = normalizeExpression(source);

  return {
    source,
    evaluate(context) {
      return evaluateNormalizedExpression(normalized, context);
    },
  };
}

export function sampleExpression(options: {
  expression: CompiledMathExpression;
  from: number;
  to: number;
  samples?: number;
  scale?: number;
  yScale?: number;
  z?: number;
}): Array<[number, number, number]> {
  const samples = Math.max(8, Math.min(512, Math.round(options.samples ?? 96)));
  const points: Array<[number, number, number]> = [];
  const span = options.to - options.from;
  const scale = options.scale ?? 1;
  const yScale = options.yScale ?? scale;
  const z = options.z ?? 0;

  for (let index = 0; index <= samples; index += 1) {
    const progress = index / samples;
    const x = options.from + span * progress;
    const y = options.expression.evaluate({ x });

    if (!Number.isFinite(y)) continue;

    points.push([x * scale, y * yScale, z]);
  }

  return points;
}

function normalizeExpression(source: string): string {
  return source
    .trim()
    .replaceAll("π", "pi")
    .replace(/\^/g, "**")
    .replace(/\s+/g, "");
}

function evaluateNormalizedExpression(source: string, context: MathExpressionContext): number {
  const tokens = tokenizeExpression(source);
  const parser = new ExpressionParser(tokens, context);
  const value = parser.parseExpression();

  if (!parser.isDone()) {
    throw new Error(`Unexpected token "${parser.peek()?.value ?? ""}" in expression "${source}".`);
  }

  return value;
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
    const char = source[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let value = char;
      index += 1;

      while (index < source.length && /[0-9.]/.test(source[index])) {
        value += source[index];
        index += 1;
      }

      tokens.push({ kind: "number", value });
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let value = char;
      index += 1;

      while (index < source.length && /[a-zA-Z0-9_]/.test(source[index])) {
        value += source[index];
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
    private readonly context: MathExpressionContext,
  ) { }

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
      const operator = this.consume()?.value;
      const right = this.parseMultiplicative();

      value = operator === "+" ? value + right : value - right;
    }

    return value;
  }

  private parseMultiplicative(): number {
    let value = this.parsePower();

    while (this.peek()?.kind === "operator" && (this.peek()?.value === "*" || this.peek()?.value === "/")) {
      const operator = this.consume()?.value;
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

    if (!token) {
      throw new Error("Unexpected end of expression.");
    }

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

      if (this.peek()?.kind !== "paren" || this.peek()?.value !== ")") {
        throw new Error("Missing closing parenthesis.");
      }

      this.consume();
      return value;
    }

    throw new Error(`Unexpected token "${token.value}".`);
  }

  private parseIdentifier(name: string): number {
    if (name === "x") return this.context.x ?? 0;
    if (name === "y") return this.context.y ?? 0;
    if (name === "t") return this.context.t ?? 0;

    if (name in SAFE_CONSTANTS) {
      return SAFE_CONSTANTS[name];
    }

    if (name in SAFE_FUNCTIONS) {
      if (this.peek()?.kind !== "paren" || this.peek()?.value !== "(") {
        throw new Error(`Function "${name}" must be called like ${name}(x).`);
      }

      this.consume();
      const value = this.parseExpression();

      if (this.peek()?.kind !== "paren" || this.peek()?.value !== ")") {
        throw new Error(`Function "${name}" is missing closing parenthesis.`);
      }

      this.consume();

      return SAFE_FUNCTIONS[name](value);
    }

    throw new Error(`Unknown symbol "${name}".`);
  }
}