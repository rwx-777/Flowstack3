export type AuthenticatedUser = {
  userId: string;
  tenantId: string;
  role: "admin" | "user";
  email: string;
};
