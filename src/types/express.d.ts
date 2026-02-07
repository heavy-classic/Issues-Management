declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      email: string;
      role: string;
    };
    userRecord?: {
      id: string;
      email: string;
      name: string | null;
      full_name: string | null;
      role: string;
      status: string;
    };
    requestIp?: string;
    requestUserAgent?: string;
  }
}
