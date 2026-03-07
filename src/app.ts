import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { envVars } from "./app/config/env";


import routes from "./app/routes";
import { globalErrorHandlers } from "./app/middlewares/globalErrorHandler";
import { notFound } from "./app/middlewares/notFound";

const app: Application = express();

app.use(cookieParser());
app.use(
  cors({

    origin: "http://localhost:3000",
    credentials: true,
  })
);

// body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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