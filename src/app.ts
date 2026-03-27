import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { envVars } from "./app/config/env";


import routes from "./app/routes";
import { globalErrorHandlers } from "./app/middlewares/globalErrorHandler";
import { notFound } from "./app/middlewares/notFound";
import { globalRateLimiter } from './app/middlewares/rateLimiter';

const app: Application = express();

// Set up security/parser middlewares
app.use(cors({ origin: [envVars.CLIENT_URL as string], credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiting
app.use("/api/v1", globalRateLimiter);

// health check
app.get("/", (req: Request, res: Response) => {
  res.send({
    message: "Career server running..",
    environment: envVars.NODE_ENV,
    uptime: process.uptime().toFixed(2) + " Sec",
    timeStamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/v1", routes);

// error handlers
app.use(globalErrorHandlers);
app.use(notFound);

export default app;