
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

export async function* readLines(paths: string[]): AsyncGenerator<string> {
    const source = paths.length === 0 ? ["-"] : paths;

    for(const path of source){
        const input = path === '-' ? process.stdin : createReadStream(path);
        const reader = createInterface({ input, crlfDelay: Infinity });
        for await (const line of reader){
            yield line;
        } 
    }
}