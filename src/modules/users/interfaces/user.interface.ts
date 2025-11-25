import { UserRole } from '../schemas/user.schema';

export interface UserContext {
  userId: string;
  role: UserRole;
}
