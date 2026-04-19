import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startWorkers } from "./workers/queue.js";

const app = createApp();
startWorkers();

app.listen(env.PORT, () => {
  console.log(`Flowstack3 API running on port ${env.PORT}`);
});
