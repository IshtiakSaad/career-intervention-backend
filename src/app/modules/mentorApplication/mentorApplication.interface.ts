import { ApplicationStatus, DocumentType } from "../../../generated/prisma";

export interface IDocumentUpload {
  type: DocumentType;
  storageUrl: string;
}

export interface IMentorApplicationSubmitPayload {
  bioDraft: string;
  expertiseAreas: string[];
  description?: string;
  documents: IDocumentUpload[];
}

export interface IMentorApplicationReviewPayload {
  status: ApplicationStatus;
  feedback?: string;
}

export interface IMentorApplicationResubmitPayload {
  bioDraft?: string;
  expertiseAreas?: string[];
  description?: string;
  documents?: IDocumentUpload[]; // To handle new or updated documents
}
