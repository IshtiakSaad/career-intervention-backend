export interface IAvailabilitySlotCreatePayload {
  startTime: Date;
  endTime: Date;
  description?: string;
}

export interface IAvailabilitySlotBulkCreatePayload {
  startDate: string; // "2024-03-20"
  endDate: string;   // "2024-03-25"
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  slotDuration: number; // minutes, e.g., 30 or 60
}
