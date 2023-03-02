import type { ModalBuilder } from "discord.js";
import type { BaseModalContext } from "../contexts";

export abstract class Modal {
    public readonly id: string;
    public readonly builder: ModalBuilder;

    protected constructor(options: ModalOptions) {
        this.id = options.id!;
        this.builder = options.builder;
    }

    public abstract run(context: BaseModalContext): Promise<void>;
}

export type ModalOptions = {
    id?: string;
    builder: ModalBuilder;
};