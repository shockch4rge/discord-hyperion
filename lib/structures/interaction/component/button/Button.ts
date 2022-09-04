import { ButtonContext } from "../../../context";
import { GuardFactory } from "../../../Guard";

export abstract class Button {
    public constructor(public readonly options: ButtonOptions) {}

    public abstract run(context: ButtonContext): Promise<void>;
}

export type ButtonOptions = {
    id: string;
    guards?: GuardFactory[];
};
