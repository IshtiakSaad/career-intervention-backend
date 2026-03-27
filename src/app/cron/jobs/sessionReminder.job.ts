import { SessionStatus, NotificationType } from "../../../generated/prisma";
import prisma from "../../utils/prisma";
import NotificationService from "../../modules/notification/notification.service";

/**
 * Session Reminder Job
 *
 * Finds CONFIRMED sessions starting within the next 65 minutes
 * and sends a reminder notification to both mentor and mentee.
 *
 * Why 65 minutes? The cron runs every 15 minutes. A session at :00
 * could be missed if the cron fires at :01 and the next window at :16.
 * The 5-minute overlap ensures no session falls through the cracks.
 *
 * Idempotency: Checks if a SESSION_REMINDER notification already exists
 * for this session ID before dispatching. No duplicate reminders.
 */
export const sessionReminder = async (): Promise<void> => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000); // +65 minutes

  try {
    const upcomingSessions = await prisma.session.findMany({
      where: {
        status: SessionStatus.CONFIRMED,
        deletedAt: null,
        startTime: {
          gte: now,
          lte: windowEnd,
        },
      },
      include: {
        mentor: { include: { user: true } },
        mentee: { include: { user: true } },
        service: true,
      },
    });

    if (upcomingSessions.length === 0) return;

    console.log(`[SessionReminder] Found ${upcomingSessions.length} upcoming session(s). Checking reminders...`);

    for (const session of upcomingSessions) {
      try {
        // Idempotency guard: check if reminder already sent for this session
        const alreadySent = await prisma.notification.findFirst({
          where: {
            type: NotificationType.SESSION_REMINDER,
            entityType: "Session",
            entityId: session.id,
          },
        });

        if (alreadySent) continue;

        // Dispatch to both parties
        await NotificationService.dispatchBulk([
          {
            userId: session.mentor.user.id,
            type: NotificationType.SESSION_REMINDER,
            title: "Session Starting Soon",
            body: `Your session "${session.service.title}" starts in approximately 1 hour.`,
            entityType: "Session",
            entityId: session.id,
          },
          {
            userId: session.mentee.user.id,
            type: NotificationType.SESSION_REMINDER,
            title: "Session Starting Soon",
            body: `Your session "${session.service.title}" starts in approximately 1 hour. Don't forget to join!`,
            entityType: "Session",
            entityId: session.id,
          },
        ]);

        console.log(`[SessionReminder] Sent reminders for session ${session.id}`);
      } catch (err: any) {
        console.error(`[SessionReminder] Failed for session ${session.id}: ${err.message}`);
      }
    }

    console.log(`[SessionReminder] Check complete.`);
  } catch (err: any) {
    console.error(`[SessionReminder] Fatal error: ${err.message}`);
  }
};
