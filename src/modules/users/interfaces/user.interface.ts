import { UserRole } from '../schemas/user.schema';

export interface UserContext {
  userId: string;
  fullName: string;
  role: UserRole;
}
