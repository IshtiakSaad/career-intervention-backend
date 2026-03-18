import { Role } from "../../../generated/prisma";

export interface IGrantRolePayload {
  userId: string;
  role: Role;
  description?: string;
}

export interface IRevokeRolePayload {
  userId: string;
  role: Role;
  description?: string;
}
