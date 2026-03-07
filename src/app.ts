import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import notFound from './app/middlewares/notFound';
import { config } from 'dotenv';
import node_env from './config/index'
import { uptime } from 'process';
import { timeStamp } from 'console';

const app: Application = express();
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

//parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req: Request, res: Response) => {
    res.send({
        message: "Career server running..",
        environment: config.node_env,
        uptime: process.uptime().toFixed(2) + " Sec",
        timeStamp: new Date().toISOString(),
    })
});


app.use(globalErrorHandler);

app.use(notFound);

export default app;