import type { Server } from "node:http";
import { startMailSink } from "./support/mail-sink";
import { MAIL_PORT } from "./support/env";

let sink: Server | undefined;

export default async function globalSetup() {
  sink = await startMailSink(MAIL_PORT);
  return async () => {
    await new Promise<void>((resolve) => (sink ? sink.close(() => resolve()) : resolve()));
  };
}
