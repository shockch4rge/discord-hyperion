import { createLogger, format, transports } from "winston";

const { colorize, combine, timestamp, printf } = format;

export enum LogLevel {
    Error = "error",
    Warn = "warn",
    Info = "info",
    Debug = "debug",
}

export abstract class Logger {
    public constructor(public readonly logChannelId?: string) {}

    public abstract log(level: LogLevel, message: string): void;
    public abstract error(message: string): void;
    public abstract warn(message: string): void;
    public abstract info(message: string): void;
    public abstract debug(message: string): void;
}

export class DefaultLogger extends Logger {
    private logger = createLogger({
        transports: [new transports.Console()],
        format: combine(
            colorize(),
            timestamp(),
            printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`)
        ),
    });

    public log(level: LogLevel, message: string): void {
        this.logger.log(level, message);
    }

    public error(message: string): void {
        this.logger.error(message);
    }

    public warn(message: string): void {
        this.logger.warn(message);
    }

    public info(message: string): void {
        this.logger.info(message);
    }

    public debug(message: string): void {
        this.logger.debug(message);
    }
}
