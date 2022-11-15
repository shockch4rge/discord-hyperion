import { BaseSelectMenuContext } from "../../../context/BaseSelectMenuContext";
import { GuardFactory } from "../../../Guard";

export abstract class SelectMenu {
    public constructor(public readonly options: SelectMenuOptions) { }

    public abstract run(context: BaseSelectMenuContext): Promise<void>;
}

export type SelectMenuOptions = {
    id: string;
    guards?: GuardFactory[];
};
