import { MessageCommandContext, SlashCommandContext } from "../../../lib/structures/context";
import { Guard } from "../../../lib/structures/Guard";

export class OwnerOnly extends Guard {
    constructor() {
        super({
            name: "OwnerOnly",
            message: "You must be the owner of the bot to use this command.",
        });
    }

    public async slashRun(context: SlashCommandContext) {
        return context.client.options.ownerIds.includes(context.interaction.user.id);
    }

    public async onSlashFail(context: SlashCommandContext) {
        await context.reply({
            content: this.options.message,
        });
    }

    public async messageRun(context: MessageCommandContext): Promise<boolean> {
        return context.client.options.ownerIds.includes(context.message.author.id);
    }
}
