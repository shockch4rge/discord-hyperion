import pino from "pino";

export class BaseLogger {
    private pino = pino({
        name: "Hyperion",
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
            },
        },
    });

    public debug(message: string) {
        this.pino.debug(message);
    }

    public info(message: string) {
        this.pino.info(message);
    }

    public warn(message: string) {
        this.pino.warn(message);
    }

    public error(message: string) {
        this.pino.error(message);
    }
}