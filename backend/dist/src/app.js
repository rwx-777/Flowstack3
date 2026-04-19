import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./routes/auth.js";
import { emailRouter } from "./routes/emails.js";
import { taskRouter } from "./routes/tasks.js";
import { calendarRouter } from "./routes/calendar.js";
export function createApp() {
    const app = express();
    app.use(helmet());
    app.use(cors());
    app.use(morgan("dev"));
    app.use(express.json({ limit: "1mb" }));
    app.get("/health", (_req, res) => {
        res.json({ ok: true });
    });
    app.use("/auth", authRouter);
    app.use("/emails", emailRouter);
    app.use("/tasks", taskRouter);
    app.use("/calendar", calendarRouter);
    app.use((error, _req, res, _next) => {
        const message = error instanceof Error ? error.message : "Unexpected error";
        res.status(400).json({ error: message });
    });
    return app;
}
