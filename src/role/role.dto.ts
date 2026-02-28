import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/pagination';

export class CreateRoleDto {
  @IsNotEmpty({ message: '角色名称不能为空' })
  @IsString({ message: '角色名称必须是字符串' })
  @MinLength(2, { message: '角色名称长度不能少于2个字符' })
  @MaxLength(64, { message: '角色名称长度不能超过64个字符' })
  name: string;

  @IsNotEmpty({ message: '角色编码不能为空' })
  @IsString({ message: '角色编码必须是字符串' })
  @MaxLength(32, { message: '角色编码长度不能超过32个字符' })
  code: string;
}

export class RolePageQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: '角色名称必须是字符串' })
  @MaxLength(64, { message: '角色名称长度不能超过64个字符' })
  name?: string;
}
