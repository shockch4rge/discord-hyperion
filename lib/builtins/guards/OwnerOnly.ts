import {
    BaseMessageCommandContext, BaseSlashCommandContext
} from "../../../lib/structures/context";
import { Guard } from "../../../lib/structures/Guard";

export class OwnerOnly extends Guard {
    constructor() {
        super({
            name: "OwnerOnly",
            message: "You must be the owner of the bot to use this command.",
        });
    }

    public async slashRun(context: BaseSlashCommandContext) {
        return context.client.options.ownerIds.includes(context.interaction.user.id);
    }

    public async onSlashFail(context: BaseSlashCommandContext) {
        await context.reply({
            content: this.options.message,
        });
    }

    public async messageRun(context: BaseMessageCommandContext) {
        return context.client.options.ownerIds.includes(context.message.author.id);
    }
}
