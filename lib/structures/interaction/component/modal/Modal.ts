import { ModalContext } from "../../../context/ModalContext";

export abstract class Modal {
    public constructor(public readonly options: ModalOptions) {}

    public abstract run(context: ModalContext): Promise<void>;
}

export type ModalOptions = {
    id: string;
};
