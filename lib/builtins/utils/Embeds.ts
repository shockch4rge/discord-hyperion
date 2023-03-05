import { Colors, EmbedBuilder } from "discord.js";

export const Embeds = {
    Unknown: (title: string) => new EmbedBuilder()
        .setAuthor({ name: `❓  ${title}` })
        .setColor(Colors.Grey),
    Success: (title: string) => new EmbedBuilder()
        .setAuthor({ name: `✅  ${title}` })
        .setColor(Colors.Green),
    Neutral: (title: string) => new EmbedBuilder()
        .setAuthor({ name: `🔹  ${title}` })
        .setColor(Colors.Blurple),
    Warning: (title: string) => new EmbedBuilder()
        .setAuthor({ name: `⚠️  ${title}` })
        .setColor(Colors.Gold),
    Error: (title: string) => new EmbedBuilder()
        .setAuthor({ name: `❌  ${title}` })
        .setColor(Colors.Red),
};
