import { SessionStatus } from "../../../generated/prisma";

export interface ISessionBookPayload {
  availabilitySlotId: string;
  serviceId: string;
  notes?: string;
}

export interface ISessionUpdatePayload {
  status?: SessionStatus;
  videoLink?: string;
  notes?: string;
}
