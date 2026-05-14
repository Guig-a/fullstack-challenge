export type AuthenticatedUser = {
  id: string;
  username?: string;
};

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
};
