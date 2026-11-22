import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";

const app = createApp();
const port = Number(process.env.PORT || 5001);

try {
  await connectDatabase(process.env.MONGODB_URI);
  app.locals.databaseReady = true;
  const server = app.listen(port, "127.0.0.1", () => {
    console.log(`Resume analysis API listening on http://127.0.0.1:${port}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
    });
  }
} catch (error) {
  console.error(`Could not start the API: ${error.message}`);
  process.exitCode = 1;
}
