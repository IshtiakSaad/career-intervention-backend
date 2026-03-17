export interface IServiceOfferingCreatePayload {
  title: string;
  description?: string;
  durationMinutes: number;
  price: number;
  currency?: string;
  serviceDescription?: string;
}

export interface IServiceOfferingUpdatePayload {
  title?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  currency?: string;
  isActive?: boolean;
  serviceDescription?: string;
}
