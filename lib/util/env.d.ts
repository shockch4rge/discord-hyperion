declare module NodeJS {
    interface ProcessEnv {
        readonly NODE_ENV: "development" | "production" | "test";
        readonly DISCORD_APP_ID: string;
        readonly DISCORD_TOKEN: string;
        readonly DISCORD_CLIENT_SECRET: string;
    }
}
