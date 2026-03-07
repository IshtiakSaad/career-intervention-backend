import { Server } from 'http';
import app from './app';
import { envVars } from './app/config/env';
import { seedSuperAdmin } from './app/utils/seedSuperAdmin';

let server: Server;

const startServer = async () => {
    try {
        // Seed Super Admin
        await seedSuperAdmin();

        // Start the server

        server = app.listen(envVars.PORT, () => {
            console.log("=========================================================")
            console.log(`🚀 Server is running on http://localhost:${envVars.PORT}`);
            console.log("=========================================================")
        });

        // Function to gracefully shut down the server
        const exitHandler = () => {
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
    } catch (error) {
        console.error('Error during server startup:', error);
        process.exit(1);
    }
}

startServer();


/*
    GRACEFULL SHUTDOWN of slipped out error
    Unhandled Rejection Error. 
    Uncaught Rejection Error. 
    Signal Termination Error.
*/

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection detected:", err);
  if (server) server.close(() => process.exit(1));
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception detected:", err);
  if (server) server.close(() => process.exit(1));
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.error("SIGTERM Recieved. Server Shutting down.");

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});
