export interface IAvailabilitySlotCreatePayload {
  startTime: Date;
  endTime: Date;
  description?: string;
}

export interface IAvailabilitySlotBulkCreatePayload {
  serviceId: string;
  startDate: string; 
  endDate: string;   
  weekdays: number[]; 
  dailyStartTime: string; 
  dailyEndTime: string;   
  timezone: string;
}
