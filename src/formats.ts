// A record = a box of label → value. Example: { status: 500, region: "eu-west-1" }
export type Rec = Record<string, unknown>;

// DECODE: lines of text → records
export async function* decode(lines: AsyncIterable<string>, format: string): AsyncGenerator<Rec> {
  let header: string[] | undefined; // CSV column names (empty until we see line 1)

  for await (const line of lines) {
    if (line.trim() === "") continue; // skip empty lines

    // JSONL: one line = one JSON record. JSON.parse does the work.
    if (format === "jsonl") {
      yield JSON.parse(line) as Rec;
      continue;
    }

    // CSV: cut the line at commas.
    const fields = line.split(",");

    // First line = column names. Save it, hand out nothing.
    if (header === undefined) {
      header = fields;
      continue;
    }

    // Other lines: pair each column name with the value in the same position.
    const record: Rec = {};
    header.forEach((key, i) => {
      const raw = fields[i] ?? ""; // missing value → empty text
      // Looks like a number? Store as a number. Otherwise keep as text.
      record[key] = raw !== "" && !isNaN(Number(raw)) ? Number(raw) : raw;
    });
    yield record;
  }
}

// ENCODE: records → text to print
export async function* encode(records: AsyncIterable<Rec>, format: string): AsyncGenerator<string> {
  // JSONL output: one record → one line. Streams (patient waiter).
  if (format === "jsonl") {
    for await (const record of records) {
      yield JSON.stringify(record) + "\n";
    }
    return;
  }

  // TABLE output: must collect ALL rows first to measure column widths.
  const rows: Rec[] = [];
  for await (const record of records) rows.push(record);
  if (rows.length === 0) return;

  // All column names, without repeats.
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];

  // Width of a column = longest of (its name, any of its values).
  const width = (col: string) =>
    Math.max(col.length, ...rows.map((r) => String(r[col] ?? "").length));
  const widths = columns.map(width);

  // Print the header line, then every row, padded with spaces so they line up.
  yield columns.map((c, i) => c.padEnd(widths[i]!)).join(" ") + "\n";
  for (const row of rows) {
    yield columns.map((c, i) => String(row[c] ?? "").padEnd(widths[i]!)).join(" ") + "\n";
  }
}
