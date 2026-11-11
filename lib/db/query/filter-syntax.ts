import type { FilterNode, FilterOp } from './state';

const OPS = new Set<FilterOp>(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'cs', 'cd', 'ov']);

/** Splits on commas that are not inside parentheses or double quotes. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quoted = false;
  let current = '';
  for (const ch of input) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === '(') depth++;
    if (!quoted && ch === ')') depth--;
    if (!quoted && depth === 0 && ch === ',') {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function unquote(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

/** `(a,b,"c,d")` → ['a', 'b', 'c,d'] */
export function parseList(value: string): string[] {
  const inner = value.trim().replace(/^\(/, '').replace(/\)$/, '');
  return splitTopLevel(inner).map(unquote);
}

/** Builds a condition from PostgREST's `op` + text value pair (`in`, `(a,b)`). */
export function conditionFromText(path: string, operator: string, value: string): FilterNode {
  let negate = false;
  let op = operator;
  if (op.startsWith('not.')) {
    negate = true;
    op = op.slice(4);
  }
  if (!OPS.has(op as FilterOp)) throw new Error(`Unsupported filter operator "${operator}"`);
  const parsed: unknown =
    op === 'in' ? parseList(value) : op === 'cs' || op === 'cd' || op === 'ov' ? parseArrayLiteral(value) : unquote(value);
  return { type: 'cond', path, op: op as FilterOp, value: parsed, negate, raw: true };
}

function parseArrayLiteral(value: string): unknown {
  const v = value.trim();
  if (v.startsWith('{') && v.endsWith('}')) return splitTopLevel(v.slice(1, -1)).map(unquote);
  if (v.startsWith('[') || v.startsWith('{')) {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

/** Parses one item of an `or=(...)` list: `col.op.value`, `not.and(...)`, `or(...)`. */
function parseItem(item: string, prefix: string): FilterNode {
  let negate = false;
  let rest = item;
  if (rest.startsWith('not.')) {
    negate = true;
    rest = rest.slice(4);
  }
  const group = /^(and|or)\(([\s\S]*)\)$/.exec(rest);
  if (group) {
    return {
      type: group[1] as 'and' | 'or',
      nodes: splitTopLevel(group[2]).map((p) => parseItem(p, prefix)),
      negate,
    };
  }
  const first = rest.indexOf('.');
  if (first < 0) throw new Error(`Invalid filter "${item}"`);
  const column = rest.slice(0, first);
  let remainder = rest.slice(first + 1);
  let innerNegate = false;
  if (remainder.startsWith('not.')) {
    innerNegate = true;
    remainder = remainder.slice(4);
  }
  const second = remainder.indexOf('.');
  if (second < 0) throw new Error(`Invalid filter "${item}"`);
  const node = conditionFromText(
    prefix ? `${prefix}.${column}` : column,
    remainder.slice(0, second),
    remainder.slice(second + 1)
  );
  if (node.type === 'cond') node.negate = negate !== innerNegate;
  return node;
}

/** `.or('a.eq.1,b.is.null')` */
export function parseOrFilter(filters: string, prefix = ''): FilterNode {
  return { type: 'or', nodes: splitTopLevel(filters).map((p) => parseItem(p, prefix)) };
}
