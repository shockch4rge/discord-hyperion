import chalk from "chalk";

export const color = (...chunks: Array<(c: chalk.Chalk) => string>) => {
    const pieces: string[] = [];

    for (const chunk of chunks) {
        const piece = chunk(chalk);

        if (piece === ".") {
            pieces.push(piece);
            continue;
        }

        pieces.push(piece, " ");
    }

    return pieces.join("");
};