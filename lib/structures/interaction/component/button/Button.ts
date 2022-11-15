import { BaseButtonContext } from "../../../context";
import { GuardFactory } from "../../../Guard";

export abstract class Button {
    public constructor(public readonly options: ButtonOptions) { }

    public abstract run(context: BaseButtonContext): Promise<void>;
}

export type ButtonOptions = {
    id: string;
    guards?: GuardFactory[];
};
