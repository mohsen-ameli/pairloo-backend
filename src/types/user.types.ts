export interface JwtPayload {
  sub: string; // user id
  email: string;
  picture?: string;
  email_verified?: boolean;
}
