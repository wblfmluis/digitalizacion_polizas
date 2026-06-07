import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../auth.constants';
import { RoleKey } from '../types/auth-user.type';

export const Roles = (...roles: RoleKey[]) => SetMetadata(ROLES_KEY, roles);
