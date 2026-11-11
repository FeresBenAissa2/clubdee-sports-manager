export type SelectNode =
  | { type: 'star' }
  | { type: 'column'; name: string; alias?: string }
  | {
      type: 'embed';
      name: string;
      alias?: string;
      hint?: string;
      inner: boolean;
      children: SelectNode[];
    };

export type EmbedNode = Extract<SelectNode, { type: 'embed' }>;

function splitItems(input: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      items.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  items.push(current);
  return items.map((i) => i.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function parseItem(item: string): SelectNode {
  if (item === '*') return { type: 'star' };

  const open = item.indexOf('(');
  const head = (open >= 0 ? item.slice(0, open) : item).replace(/\s+/g, '');
  const colon = head.indexOf(':');
  const alias = colon >= 0 && head[colon + 1] !== ':' ? head.slice(0, colon) : undefined;
  const target = alias ? head.slice(colon + 1) : head;

  if (open < 0) {
    return { type: 'column', name: target.split('::')[0], alias };
  }

  const [name, ...modifiers] = target.split('!');
  let inner = false;
  let hint: string | undefined;
  for (const modifier of modifiers) {
    if (modifier === 'inner') inner = true;
    else if (modifier === 'left') inner = false;
    else hint = modifier;
  }
  const body = item.slice(open + 1, item.lastIndexOf(')'));
  return { type: 'embed', name, alias, hint, inner, children: parseSelect(body) };
}

export function parseSelect(select: string): SelectNode[] {
  const items = splitItems(select ?? '*');
  return items.length ? items.map(parseItem) : [{ type: 'star' }];
}

/** The key the embed is returned under, which is also how filters refer to it. */
export function embedKey(node: EmbedNode): string {
  return node.alias ?? node.name;
}
