import { SessionStatus } from "../../../generated/prisma";

export interface ISessionBookPayload {
  availabilitySlotId: string;
  serviceId: string;
  notes?: string;
  idempotencyKey: string;
}

export interface ISessionUpdatePayload {
  status?: SessionStatus;
  meetingLink?: string;
  notes?: string;
  version: number; // Required for optimistic concurrency
}
