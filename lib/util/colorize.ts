import chalk from "chalk";

export function colorize(...chunks: TextChunkBuilder[]){
    return chunks.map(chunk => chunk(chalk)).join(" ");
}

type TextChunkBuilder = (c: chalk.Chalk) => string;