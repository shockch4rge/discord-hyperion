import type { AnyConstructor } from "./types";

export const isConstructor = (value: unknown): value is AnyConstructor => {
    return typeof value === "function" && value.toString().startsWith("class");
};

export const numberEmojis = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

export const buildNumberEmoji = (number: number) => {
    const numberString = number.toString();
    const isNegative = number < 0 && numberString.startsWith("-");
    const absoluteNumberString = isNegative ? numberString.slice(1) : numberString;

    return (isNegative ? "➖" : "") + absoluteNumberString
        .split("")
        .map(digit => numberEmojis[+digit])
        .join("");
};

