import { BaseModalContext } from "../../../context/BaseModalContext";

export abstract class Modal {
    public constructor(public readonly options: ModalOptions) { }

    public abstract run(context: BaseModalContext): Promise<void>;
}

export type ModalOptions = {
    id: string;
};
