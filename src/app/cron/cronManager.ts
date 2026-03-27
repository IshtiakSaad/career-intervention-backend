import * as cron from "node-cron";
import { sessionVacuum } from "./jobs/sessionVacuum.job";
import { sessionReminder } from "./jobs/sessionReminder.job";

/**
 * CronManager — Central registry for all scheduled jobs.
 *
 * Called once from server.ts on startup.
 * Provides graceful shutdown via stop().
 */
class CronManager {
  private static jobs: ReturnType<typeof cron.schedule>[] = [];

  /**
   * Start all scheduled jobs.
   */
  static start(): void {
    console.log("⏰ CronManager: Starting scheduled jobs...");

    // Session Vacuum: every 5 minutes
    this.jobs.push(
      cron.schedule("*/5 * * * *", async () => {
        console.log(`[Cron] Session Vacuum triggered at ${new Date().toISOString()}`);
        await sessionVacuum();
      })
    );

    // Session Reminder: every 15 minutes
    this.jobs.push(
      cron.schedule("*/15 * * * *", async () => {
        console.log(`[Cron] Session Reminder triggered at ${new Date().toISOString()}`);
        await sessionReminder();
      })
    );

    console.log(`⏰ CronManager: ${this.jobs.length} jobs registered.`);
  }

  /**
   * Stop all scheduled jobs gracefully.
   */
  static stop(): void {
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    console.log("⏰ CronManager: All jobs stopped.");
  }
}

export default CronManager;
