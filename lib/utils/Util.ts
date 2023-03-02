
export const isConstructor = (value: unknown): value is new (...args: any[]) => any => {
    return typeof value === "function" && value.toString().startsWith("class");
};

export const numberEmojis = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

export const buildNumberEmoji = (number: number) => {
    const numberString = number.toString();
    const isNegative = number < 0 && numberString.startsWith("-");
    const absoluteNumberString = isNegative ? numberString.slice(1) : numberString;
    const digits = absoluteNumberString.split("");

    return (isNegative ? "➖" : "") + digits.map(digit => numberEmojis[+digit])
        .join("");
};

export const useTry = async <T>(fn: (...args: any[]) => Promise<T>) => {
    try {
        return [null, await fn()] as [null, T];
    }
    catch (error) {
        return [error] as [Error];
    }
};

const test = async () => {
    const [error, val] = await useTry(async () => {
        return 3;
    });

    if (error) {
        
    }
};
