import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: '昵称不能为空' })
  @IsString({ message: '昵称必须是字符串' })
  @MinLength(2, { message: '昵称长度不能少于2个字符' })
  @MaxLength(32, { message: '昵称长度不能超过32个字符' })
  nickname: string;

  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(4, { message: '用户名长度不能少于4个字符' })
  @MaxLength(32, { message: '用户名长度不能超过32个字符' })
  username: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码长度不能少于8个字符' })
  @MaxLength(32, { message: '密码长度不能超过32个字符' })
  password: string;
}
