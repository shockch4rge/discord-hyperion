import { z } from "zod";
import { validateProcess } from "../start";

declare namespace NodeJS {
  interface ProcessEnv extends z.infer<typeof validateProcess> { }
}