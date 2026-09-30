import type { Rec } from "./formats.js";

// Filter expressions: status == 500 and level == warn
// Tokens must be space-separated (the real version walks characters instead).

type Node =
  | { kind: "and"; left: Node; right: Node }
  | { kind: "or"; left: Node; right: Node }
  | { kind: "compare"; path: string; op: string; value: string };

export function parse(source: string): Node {
  const tokens = source.trim().split(/\s+/);
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++] ?? "";

  // Precedence lives in the call chain: parseOr -> parseAnd -> parseCompare.
  // Lowest precedence sits highest, so it lands nearest the root and runs last.
  function parseOr(): Node {
    let left = parseAnd();
    while (peek() === "or") {
      next();
      left = { kind: "or", left, right: parseAnd() };
    }
    return left;
  }

  function parseAnd(): Node {
    let left = parseCompare();
    while (peek() === "and") {
      next();
      left = { kind: "and", left, right: parseCompare() };
    }
    return left;
  }

  function parseCompare(): Node {
    return { kind: "compare", path: next(), op: next(), value: next() };
  }

  return parseOr();
}

export function evaluate(node: Node, record: Rec): boolean {
  if (node.kind === "and") return evaluate(node.left, record) && evaluate(node.right, record);
  if (node.kind === "or") return evaluate(node.left, record) || evaluate(node.right, record);

  const actual = String(record[node.path]);
  switch (node.op) {
    case "==": return actual === node.value;
    case "!=": return actual !== node.value;
    case ">": return Number(actual) > Number(node.value);
    case "<": return Number(actual) < Number(node.value);
    default: throw new Error(`unknown operator: ${node.op}`);
  }
}