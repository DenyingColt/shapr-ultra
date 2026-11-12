import { ParametricVariable, UnitSystem } from '../types/cad';

/**
 * Evaluates mathematical expressions with parametric variables, standard math functions,
 * constants (PI, E), and unit suffixes (mm, cm, m, in, deg).
 * Returns dimensions normalized to millimeters (mm) or degrees/unitless.
 */
export function evaluateParametricExpression(
  rawExpr: string | number,
  variables: ParametricVariable[] = [],
  currentUnit: UnitSystem = 'mm'
): { valid: boolean; value: number; error?: string } {
  if (typeof rawExpr === 'number') {
    return { valid: Number.isFinite(rawExpr), value: rawExpr };
  }

  let expr = rawExpr.trim();
  if (!expr) {
    return { valid: false, value: 0, error: 'Empty expression' };
  }

  // Unit conversion factors to internal millimeters (mm)
  const unitFactors: Record<string, number> = {
    mm: 1,
    cm: 10,
    m: 1000,
    in: 25.4,
    deg: 1,
  };

  // Replace unit suffixes attached to numbers e.g. "2.5in", "15cm", "45mm"
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*(mm|cm|m|in|deg)\b/gi, (_, numStr, unitStr) => {
    const factor = unitFactors[unitStr.toLowerCase()] ?? 1;
    return `(${parseFloat(numStr) * factor})`;
  });

  // Sort variables by name length descending so longer names are substituted first
  const sortedVars = [...variables].sort((a, b) => b.name.length - a.name.length);
  for (const v of sortedVars) {
    if (!v.name) continue;
    const escaped = v.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'g');
    expr = expr.replace(regex, `(${v.value})`);
  }

  // Replace mathematical constants and functions with safe tokens
  expr = expr
    .replace(/\bPI\b/gi, `(${Math.PI})`)
    .replace(/\bE\b/g, `(${Math.E})`)
    .replace(/\^/g, '**');

  // Tokenize and evaluate safely via recursive-descent / Shunting-Yard parser
  try {
    const result = safeMathEval(expr);
    if (!Number.isFinite(result)) {
      return { valid: false, value: 0, error: 'Non-finite result' };
    }
    // If the user typed a plain number without units, scale from current display unit if needed
    return { valid: true, value: result };
  } catch (err) {
    return {
      valid: false,
      value: 0,
      error: err instanceof Error ? err.message : 'Invalid expression',
    };
  }
}

type Token =
  | { type: 'num'; val: number }
  | { type: 'op'; val: string }
  | { type: 'func'; val: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.replace(/\s+/g, '');

  while (i < s.length) {
    const ch = s[i];

    // Check unary minus or plus at start or after '(' or operator
    const isUnary =
      (ch === '-' || ch === '+') &&
      (tokens.length === 0 ||
        tokens[tokens.length - 1].type === 'op' ||
        tokens[tokens.length - 1].type === 'lparen');

    if (/\d|\./.test(ch) || (isUnary && /\d|\./.test(s[i + 1] || ''))) {
      let numStr = ch;
      i++;
      while (i < s.length && /[\d.]/.test(s[i])) {
        numStr += s[i++];
      }
      const val = parseFloat(numStr);
      if (Number.isNaN(val)) throw new Error(`Invalid number: ${numStr}`);
      tokens.push({ type: 'num', val });
      continue;
    }

    if (isUnary && s[i + 1] === '(') {
      if (ch === '-') {
        tokens.push({ type: 'num', val: -1 });
        tokens.push({ type: 'op', val: '*' });
      }
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    if (s.slice(i, i + 2) === '**') {
      tokens.push({ type: 'op', val: '^' });
      i += 2;
      continue;
    }

    if ('+-*/^'.includes(ch)) {
      tokens.push({ type: 'op', val: ch });
      i++;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let fn = '';
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
        fn += s[i++];
      }
      tokens.push({ type: 'func', val: fn.toLowerCase() });
      continue;
    }

    throw new Error(`Unexpected character: ${ch}`);
  }

  return tokens;
}

function safeMathEval(expr: string): number {
  const tokens = tokenize(expr);
  const outputQueue: Token[] = [];
  const opStack: Token[] = [];

  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '^': 3,
  };

  const rightAssoc: Record<string, boolean> = {
    '^': true,
  };

  for (const token of tokens) {
    if (token.type === 'num') {
      outputQueue.push(token);
    } else if (token.type === 'func') {
      opStack.push(token);
    } else if (token.type === 'op') {
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];
        if (
          top.type === 'func' ||
          (top.type === 'op' &&
            ((!rightAssoc[token.val] && precedence[token.val] <= precedence[top.val]) ||
              (rightAssoc[token.val] && precedence[token.val] < precedence[top.val])))
        ) {
          outputQueue.push(opStack.pop()!);
        } else {
          break;
        }
      }
      opStack.push(token);
    } else if (token.type === 'lparen') {
      opStack.push(token);
    } else if (token.type === 'rparen') {
      while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'lparen') {
        outputQueue.push(opStack.pop()!);
      }
      if (opStack.length === 0) throw new Error('Mismatched parentheses');
      opStack.pop(); // remove lparen
      if (opStack.length > 0 && opStack[opStack.length - 1].type === 'func') {
        outputQueue.push(opStack.pop()!);
      }
    }
  }

  while (opStack.length > 0) {
    const top = opStack.pop()!;
    if (top.type === 'lparen' || top.type === 'rparen') {
      throw new Error('Mismatched parentheses');
    }
    outputQueue.push(top);
  }

  const evalStack: number[] = [];
  for (const t of outputQueue) {
    if (t.type === 'num') {
      evalStack.push(t.val);
    } else if (t.type === 'op') {
      const b = evalStack.pop();
      const a = evalStack.pop();
      if (a === undefined || b === undefined) throw new Error('Invalid syntax');
      switch (t.val) {
        case '+':
          evalStack.push(a + b);
          break;
        case '-':
          evalStack.push(a - b);
          break;
        case '*':
          evalStack.push(a * b);
          break;
        case '/':
          evalStack.push(b === 0 ? 0 : a / b);
          break;
        case '^':
          evalStack.push(Math.pow(a, b));
          break;
      }
    } else if (t.type === 'func') {
      const a = evalStack.pop();
      if (a === undefined) throw new Error(`Missing argument for ${t.val}`);
      switch (t.val) {
        case 'sin':
          evalStack.push(Math.sin((a * Math.PI) / 180));
          break;
        case 'cos':
          evalStack.push(Math.cos((a * Math.PI) / 180));
          break;
        case 'tan':
          evalStack.push(Math.tan((a * Math.PI) / 180));
          break;
        case 'asin':
          evalStack.push((Math.asin(a) * 180) / Math.PI);
          break;
        case 'acos':
          evalStack.push((Math.acos(a) * 180) / Math.PI);
          break;
        case 'atan':
          evalStack.push((Math.atan(a) * 180) / Math.PI);
          break;
        case 'sqrt':
          evalStack.push(Math.sqrt(Math.max(0, a)));
          break;
        case 'abs':
          evalStack.push(Math.abs(a));
          break;
        case 'round':
          evalStack.push(Math.round(a));
          break;
        case 'floor':
          evalStack.push(Math.floor(a));
          break;
        case 'ceil':
          evalStack.push(Math.ceil(a));
          break;
        default:
          throw new Error(`Unknown function: ${t.val}`);
      }
    }
  }

  if (evalStack.length !== 1) throw new Error('Malformed expression');
  return evalStack[0];
}

export function formatUnitValue(valueMm: number, unit: UnitSystem): string {
  switch (unit) {
    case 'mm':
      return `${valueMm.toFixed(2)} mm`;
    case 'cm':
      return `${(valueMm / 10).toFixed(2)} cm`;
    case 'm':
      return `${(valueMm / 1000).toFixed(3)} m`;
    case 'in':
      return `${(valueMm / 25.4).toFixed(3)} in`;
  }
}

export function recomputeAllVariables(vars: ParametricVariable[]): ParametricVariable[] {
  const resolved: ParametricVariable[] = [];
  for (const v of vars) {
    const res = evaluateParametricExpression(v.expression, resolved);
    resolved.push({
      ...v,
      value: res.valid ? res.value : v.value,
    });
  }
  return resolved;
}
