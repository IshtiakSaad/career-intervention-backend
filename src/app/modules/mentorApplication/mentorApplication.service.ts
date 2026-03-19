import { MentorApplication, ApplicationStatus, Role, DocumentStatus, AuditAction, AuditEventType } from "../../../generated/prisma";
import prisma from "../../utils/prisma";
import { AppError } from "../../errorHelpers/app-error";
import httpStatus from "http-status";
import { IMentorApplicationSubmitPayload, IMentorApplicationResubmitPayload, IDocumentUpload } from "./mentorApplication.interface";
import AuditService from "../audit/audit.service";

/**
 * Submit a new application to become a Mentor.
 * Only users who are not already Mentors (or active applicants) can submit.
 */
const submitApplication = async (
  userId: string,
  payload: IMentorApplicationSubmitPayload
): Promise<MentorApplication> => {
  const { bioDraft, expertiseAreas, description, documents } = payload;

  // 1. Check if user already has an active or pending application
  const existingApplication = await prisma.mentorApplication.findFirst({
    where: {
      userId,
      status: { in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW] },
    },
  });

  if (existingApplication) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You already have a pending application under review."
    );
  }

  // 2. Check if user is already a MENTOR
  const alreadyMentor = await prisma.userRole.findFirst({
    where: { userId, role: Role.MENTOR, revokedAt: null },
  });

  if (alreadyMentor) {
    throw new AppError(httpStatus.BAD_REQUEST, "You are already a mentor.");
  }

  // 3. Create application and documents in a transaction
  return await prisma.$transaction(async (tx) => {
    const application = await tx.mentorApplication.create({
      data: {
        userId,
        bioDraft,
        expertiseAreas,
        description,
        status: ApplicationStatus.SUBMITTED,
        documents: {
          create: documents.map((doc) => ({
            ownerId: userId,
            type: doc.type,
            storageUrl: doc.storageUrl,
            verificationStatus: DocumentStatus.PENDING,
          })),
        },
      },
      include: {
        documents: true,
      },
    });

    await AuditService.log({
        actorId: userId,
        eventType: AuditEventType.APPLICATION_EVENT,
        action: AuditAction.CREATE,
        entityType: "MentorApplication",
        entityId: application.id,
        stateAfter: application
    }, tx);

    return application;
  });
};

/**
 * Admin Review: Approve, Reject, or Send Back for Changes (ACTION_NEEDED).
 */
const reviewApplication = async (
  adminId: string,
  applicationId: string,
  status: ApplicationStatus,
  feedback?: string
): Promise<MentorApplication> => {
  // 1. Find Application
  const application = await prisma.mentorApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });

  if (!application) {
    throw new AppError(httpStatus.NOT_FOUND, "Application not found");
  }

  // 2. Resolve Admin Profile ID
  const adminProfile = await prisma.admin.findUnique({
    where: { email: (await prisma.user.findUnique({ where: { id: adminId } }))?.email }
  });

  if (!adminProfile) {
    throw new AppError(httpStatus.FORBIDDEN, "Only valid admins can review applications");
  }

  // 3. Update status in a transaction
  return await prisma.$transaction(async (tx) => {
    const updatedApplication = await tx.mentorApplication.update({
      where: { id: applicationId },
      data: {
        status,
        reviewedById: adminProfile.id,
        reviewedAt: new Date(),
        feedback,
      },
    });

    let auditAction: AuditAction = AuditAction.UPDATE;
    if (status === ApplicationStatus.APPROVED) auditAction = AuditAction.APPROVE;
    if (status === ApplicationStatus.REJECTED) auditAction = AuditAction.REJECT;

    await AuditService.log({
        actorId: adminId,
        eventType: AuditEventType.APPLICATION_EVENT,
        action: auditAction,
        entityType: "MentorApplication",
        entityId: applicationId,
        stateBefore: application,
        stateAfter: updatedApplication,
        reason: feedback
    }, tx);

    if (status === ApplicationStatus.APPROVED) {
      // Create userRole
      const newRole = await tx.userRole.upsert({
        where: { userId_role: { userId: application.userId, role: Role.MENTOR } },
        update: { revokedAt: null, grantedById: adminProfile.id },
        create: {
          userId: application.userId,
          role: Role.MENTOR,
          grantedById: adminProfile.id,
          description: `Approved application ID: ${applicationId}`
        }
      });

      await AuditService.log({
        actorId: adminId,
        eventType: AuditEventType.ROLE_CHANGE,
        action: AuditAction.GRANT,
        entityType: "UserRole",
        entityId: newRole.id,
        stateAfter: newRole,
        reason: "Auto-granted upon application approval"
      }, tx);

      // Create/Update Mentor Profile
      await tx.mentorProfile.upsert({
          where: { email: application.user.email },
          update: { 
              activeStatus: true,
              bio: application.bioDraft,
              description: application.description,
          },
          create: {
              email: application.user.email,
              bio: application.bioDraft,
              description: application.description,
          }
      });
    }

    return updatedApplication;
  });
};

/**
 * Resubmit Application (Mentee): Update the application when status is ACTION_NEEDED.
 */
const resubmitApplication = async (
  userId: string,
  applicationId: string,
  payload: IMentorApplicationResubmitPayload
): Promise<MentorApplication> => {
  const application = await prisma.mentorApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application || application.userId !== userId) {
    throw new AppError(httpStatus.NOT_FOUND, "Application not found");
  }

  if (application.status !== ApplicationStatus.ACTION_NEEDED) {
    throw new AppError(httpStatus.BAD_REQUEST, "Application is not in a state for resubmission.");
  }

  const { bioDraft, expertiseAreas, description, documents } = payload;

  return await prisma.$transaction(async (tx) => {
    // 1. Update Application Status to SUBMITTED
    const updatedApp = await tx.mentorApplication.update({
      where: { id: applicationId },
      data: {
        bioDraft: bioDraft ?? application.bioDraft,
        expertiseAreas: expertiseAreas ?? application.expertiseAreas,
        description: description ?? application.description,
        status: ApplicationStatus.SUBMITTED,
        // Optional: clear the previous admin feedback if user has addressed it
      },
    });

    // 2. Handle Documents (simple approach: delete old PENDING docs and add new ones, or keep and add)
    // For now, let's just allow adding more documents if provided
    if (documents && documents.length > 0) {
      await tx.document.createMany({
        data: documents.map((doc: IDocumentUpload) => ({
          ownerId: userId,
          applicationId,
          type: doc.type,
          storageUrl: doc.storageUrl,
          verificationStatus: DocumentStatus.PENDING,
        }))
      });
    }

    return updatedApp;
  });
};

/**
 * Get all applications (Admin Queue)
 */
const getAllApplications = async (filters: any) => {
    return await prisma.mentorApplication.findMany({
        where: filters,
        include: {
            user: { select: { name: true, email: true, profileImageUrl: true } },
            documents: true
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Get single user's applications
 */
const getMyApplications = async (userId: string) => {
    return await prisma.mentorApplication.findMany({
        where: { userId },
        include: { documents: true },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Get single application details
 */
const getSingleApplication = async (id: string) => {
    return await prisma.mentorApplication.findUnique({
        where: { id },
        include: {
            user: { select: { name: true, email: true, profileImageUrl: true } },
            documents: true,
            reviewedBy: { include: { user: { select: { name: true } } } }
        }
    });
};

export const MentorApplicationService = {
  submitApplication,
  reviewApplication,
  getAllApplications,
  getMyApplications,
  getSingleApplication,
  resubmitApplication
};
