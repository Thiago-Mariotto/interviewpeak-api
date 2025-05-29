import { IsString, IsEmail, IsEnum } from 'class-validator';

export enum AdminUserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export class AdminUserResponseDto {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class FindUserByEmailDto {
  @IsString()
  @IsEmail()
  email: string;
}

export class UpdateUserRoleDto {
  @IsEnum(AdminUserRole)
  role: AdminUserRole;
}

export class AdminUserStatsDto {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByRole: {
    admin: number;
    user: number;
  };
}
