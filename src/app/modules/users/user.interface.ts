// src/app/modules/users/user.interface.ts
import { Gender, Role } from "../../../generated/prisma";

/**
 * Payload for self-registration (MENTEE only)
 */
export interface IUserRegisterPayload {
  email: string;
  password: string;
  name?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  gender: Gender;
  careerGoals?: string; // For Mentees
}

/**
 * Payload for admin creating users (MENTOR or ADMIN)
 */
export interface IUserCreateByAdminPayload extends IUserRegisterPayload {
  role: string | Role; // e.g. MENTOR / MENTEE / ADMIN
  bio?: string; // For Mentors
  experience?: number; // For Mentors
  designation?: string; // For Mentors
  currentWorkingPlace?: string; // For Mentors
}


/**
 * Payload for updating a user (self or admin)
 * Excludes role and ID to prevent privilege escalation
 */
export interface IUserUpdatePayload {
  name?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  timezone?: string;
}

/**
 * Response shape for user
 * Can extend or pick fields from Prisma User type
 */
export interface IUserResponse {
  id: string;
  email: string;
  name?: string | null;
  phoneNumber?: string | null;
  profileImageUrl?: string | null;
  gender: Gender;
  role: string | Role | string[];
  createdAt: Date;
  updatedAt: Date;
}