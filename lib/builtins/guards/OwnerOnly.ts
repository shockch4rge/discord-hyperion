import type { BaseSlashCommandContext } from "../../structs";
import { Guard } from "../../structs";

export default class extends Guard {
    constructor() {
        super({
            name: "owner-only",
            description: "Restricts usage of this interaction to the owner of the bot.",
        });
    }

    async slashRun(context: BaseSlashCommandContext) {
        return context.client.ownerIds.includes(context.user.id);
    }

    async slashFail(context: BaseSlashCommandContext) {
        await context.reply(
            e => e.setAuthor({ name: `❌  This command can only be used by ${context.client.name}'s owner.` })
        );
    }
}