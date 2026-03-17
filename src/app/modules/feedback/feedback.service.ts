import { Feedback, SessionStatus } from '../../../generated/prisma';
import prisma from '../../utils/prisma';
import { IFeedbackCreatePayload } from './feedback.interface';
import { AppError } from '../../errorHelpers/app-error';
import httpStatus from 'http-status';

const createFeedback = async (
  userId: string,
  payload: IFeedbackCreatePayload
): Promise<Feedback> => {
  const { sessionId, rating, comments } = payload;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { mentor: true, mentee: true }
  });

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Session not found");
  }

  if (session.status !== SessionStatus.COMPLETED) {
    throw new AppError(httpStatus.BAD_REQUEST, "Feedback can only be given for completed sessions");
  }

  // Check if current user is the mentee of this session
  const mentee = await prisma.menteeProfile.findUnique({
      where: { email: (await prisma.user.findUnique({where:{id:userId}}))?.email }
  });

  if (!mentee || session.menteeId !== mentee.id) {
    throw new AppError(httpStatus.FORBIDDEN, "Only the mentee of the session can give feedback");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Create feedback
    const feedback = await tx.feedback.create({
      data: {
        sessionId,
        reviewerId: userId,
        revieweeId: (await tx.user.findFirst({where:{mentorProfile:{id:session.mentorId}}}))?.id!,
        rating,
        comments
      }
    });

    // 2. Update mentor rating stats
    const mentor = await tx.mentorProfile.findUnique({
      where: { id: session.mentorId }
    });

    if (mentor) {
      const newRatingCount = mentor.ratingCount + 1;
      const newRatingAverage = (mentor.ratingAverage * mentor.ratingCount + rating) / newRatingCount;

      await tx.mentorProfile.update({
        where: { id: session.mentorId },
        data: {
          ratingCount: newRatingCount,
          ratingAverage: newRatingAverage
        }
      });
    }

    return feedback;
  });
};

const getMentorFeedbacks = async (mentorId: string) => {
  return await prisma.feedback.findMany({
    where: {
      revieweeId: (await prisma.user.findFirst({where:{mentorProfile:{id:mentorId}}}))?.id
    },
    include: {
      reviewer: true,
      session: { include: { service: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const FeedbackService = {
  createFeedback,
  getMentorFeedbacks
};
