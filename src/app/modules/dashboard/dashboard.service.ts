import prisma from "../../utils/prisma";

class DashboardService {
  /**
   * Aggregate high-level metrics for the Admin dashboard.
   */
  public static async getAdminStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      revenueResult,
      activeMentors,
      totalSessions,
      totalDisputes,
      pendingPayouts,
      recentBookings,
    ] = await Promise.all([
      // 1. Total Successful Revenue
      prisma.paymentIntent.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCESS" },
      }),

      // 2. Active Mentors
      prisma.mentorProfile.count({
        where: { activeStatus: true },
      }),

      // 3. Total Sessions (for dispute rate)
      prisma.session.count({
        where: { deletedAt: null },
      }),

      // 4. Total Disputes
      prisma.dispute.count(),

      // 5. Total Pending Payouts (Platform Liability)
      prisma.payout.aggregate({
        _sum: { mentorShare: true },
        where: { status: "PENDING_PAYOUT" },
      }),

      // 6. Recent Platform Activity (Last 30 days)
      prisma.session.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          deletedAt: null,
        },
      }),
    ]);

    const sessionCount = totalSessions || 1; // Prevent div by zero
    const disputeRate = (totalDisputes / sessionCount) * 100;

    return {
      totalRevenue: Number(revenueResult._sum.amount || 0),
      activeMentors,
      totalSessions,
      totalDisputes,
      disputeRate: parseFloat(disputeRate.toFixed(2)),
      pendingPayoutsVolume: Number(pendingPayouts._sum.mentorShare || 0),
      recentBookingsCount: recentBookings,
    };
  }

  /**
   * Aggregate performance metrics for a specific Mentor.
   */
  public static async getMentorStats(mentorId: string) {
    const now = new Date();

    const [
      earningsResult,
      pendingResult,
      upcomingSessions,
      mentorProfile,
      totalSessions,
    ] = await Promise.all([
      // 1. Lifetime Earnings (Processed)
      prisma.payout.aggregate({
        _sum: { mentorShare: true },
        where: { mentorId, status: "PAID" },
      }),

      // 2. Pending Payouts (Work done, but not yet paid to bank)
      prisma.payout.aggregate({
        _sum: { mentorShare: true },
        where: { mentorId, status: "PENDING_PAYOUT" },
      }),

      // 3. Upcoming Confirmed Sessions
      prisma.session.count({
        where: {
          mentorId,
          status: "CONFIRMED",
          startTime: { gt: now },
          deletedAt: null,
        },
      }),

      // 4. Mentor Profile (for rating and count)
      prisma.mentorProfile.findUnique({
        where: { id: mentorId },
        select: { ratingAverage: true, ratingCount: true }
      }),

      // 5. Total Lifetime Sessions
      prisma.session.count({
        where: { mentorId, deletedAt: null },
      }),
    ]);

    return {
      lifetimeEarnings: Number(earningsResult._sum.mentorShare || 0),
      pendingPayouts: Number(pendingResult._sum.mentorShare || 0),
      upcomingSessionsCount: upcomingSessions,
      averageRating: mentorProfile?.ratingAverage || 0,
      totalSessionsCount: totalSessions,
    };
  }
}

export default DashboardService;
