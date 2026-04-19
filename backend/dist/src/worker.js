import "dotenv/config";
import { startWorkers } from "./workers/queue.js";
startWorkers();
console.log("Worker started");
