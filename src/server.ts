import { Server } from 'http';
import app from './app';
import { envVars } from './app/config/env';
import { seedSuperAdmin } from './app/utils/seedSuperAdmin';
import CronManager from './app/cron/cronManager';

let server: Server;

const startServer = async () => {
    try {
        // Seed Super Admin
        await seedSuperAdmin();

        // Start scheduled jobs
        CronManager.start();

        // Start the server

        server = app.listen(envVars.PORT, () => {
            console.log("=========================================================")
            console.log(`🚀 Server is running on http://localhost:${envVars.PORT}`);
            console.log("=========================================================")
        });

        // Function to gracefully shut down the server
        const exitHandler = () => {
            CronManager.stop();
            if (server) {
                server.close(() => {
                    console.log('Server closed gracefully.');
                    process.exit(1); // Exit with a failure code
                });
            } else {
                process.exit(1);
            }
        };

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (error) => {
            console.log('Unhandled Rejection is detected, we are closing our server...');
            if (server) {
                server.close(() => {
                    console.log(error);
                    process.exit(1);
                });
            } else {
                process.exit(1);
            }
        });

        // Register signal handlers
        process.on('SIGINT', exitHandler);
        process.on('SIGTERM', exitHandler);
    } catch (error) {
        console.error('Error during server startup:', error);
        process.exit(1);
    }
}

startServer();