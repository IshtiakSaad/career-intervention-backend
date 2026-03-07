export interface ILoginPayload {
  email: string;
  passwordHash: string;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken?: string;
  needsPasswordChange?: boolean;
}
