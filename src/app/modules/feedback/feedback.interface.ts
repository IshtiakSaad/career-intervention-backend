export interface IFeedbackCreatePayload {
  sessionId: string;
  rating: number;
  comments?: string;
}
