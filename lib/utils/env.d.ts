declare namespace NodeJS {
    interface ProcessEnv {
        readonly NODE_ENV: "development" | "production" | "test";
        readonly CLIENT_TOKEN: string;
        readonly CLIENT_ID: string;
  }
}