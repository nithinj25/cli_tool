import { connect } from "node:http2";
import { fileURLToPath } from "node:url";

export type Rec = Record<string, unknown>

export async function* decode(lines: AsyncIterable<string>, format: string) : AsyncGenerator<Rec>{
    let header: string[] | undefined;

    for await (const line of lines){
        if(line.trim() === "") continue;

        if(format === "jsonl"){
            yield JSON.parse(line) as Rec;
            continue;
        }

        const fields = line.split(",");
        if(header === undefined){
            header = fields;
            continue;
        }

        const record: Rec = {};
        header.forEach((key, i) => {
            const raw = fields[i] ?? "";
            record[key] = raw !== "" && !isNaN(Number(raw)) ? Number(raw) : raw;
        });
        yield record;
    }
}

export async function* encode(records: AsyncIterable<Rec>, format: string) : AsyncGenerator<string> {
    if(format === "jsonl"){
        for await (const record of records){
            yield JSON.stringify(record) + "\n";
        }

        return;
    }

    const rows: Rec[] = [];
    for await (const record of records) rows.push(record);
    if(rows.length === 0) return;

    const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const width = (col: string) => 
        Math.max(col.length, ...rows.map((r) => String(r[col] ?? "").length));

    const widths = columns.map(width);

    yield columns.map((c, i) => c.padEnd(widths[i]!)).join(" ") + "\n";
    for(const row of rows){
        yield columns.map((c, i) => String(row[c] ?? "").padEnd(widths[i]!)).join(" ") + "\n";
    } 
}