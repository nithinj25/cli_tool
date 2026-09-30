import type { Rec } from "./formats.js";
import { evaluate, parse } from "./expr.js";

export type Transform = (recoreds: AsyncIterable<Rec>) => AsyncIterable<Rec>;

export function filter(expressions: string): Transform {
    const ast = parse(expressions);
    return async function* (records) {
        for await (const record of records){
            if(evaluate(ast, record)) yield record;
        }
    };
}

export function head(limit: number): Transform {
    return async function*(records) {
        let seen = 0;
        for await (const record of records){
            yield record;

            if(++seen >= limit) return;
        }
    };
}

export function stats(by: string | undefined): Transform {
    return async function*(records) {
        const counts = new Map<string, number>();
        for await (const record of records) {
            const key = by === undefined ? "total" : String(record[by]);
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        for(const [key, count] of [...counts].sort((a, b) => b[1] - a[1])){
            yield by === undefined ? { count } : { [by]: key, count };
        }
    }
}