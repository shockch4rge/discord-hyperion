import { Colors, EmbedBuilder } from "discord.js";

export const Embeds = {
    Unknown: (title = "Unknown") => new EmbedBuilder()
        .setAuthor({ name: `❓  ${title}` })
        .setColor(Colors.Grey),
    Success: (title = "Success") => new EmbedBuilder()
        .setAuthor({ name: `✅  ${title}` })
        .setColor(Colors.Green),
    Neutral: (title = "Neutral") => new EmbedBuilder()
        .setAuthor({ name: `🔹  ${title}` })
        .setColor(Colors.Blurple),
    Warning: (title = "Warning") => new EmbedBuilder()
        .setAuthor({ name: `⚠️  ${title}` })
        .setColor(Colors.Gold),
    Error: (title = "Error") => new EmbedBuilder()
        .setAuthor({ name: `❌  ${title}` })
        .setColor(Colors.Red),
};
