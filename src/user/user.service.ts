import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './user.dto';
import { randomBytes, createHash } from 'crypto';
import { compare, genSalt, hash } from 'bcrypt';

function isComplexPassword(password: string): boolean {
  // 至少包含一个小写字母、一个大写字母、一个数字、一个特殊符号
  // 特殊符号范围: ~!@#$%^&*()-_=+[]{}|;:'",.<>?/` 以及常用非字母数字
  const lower = /[a-z]/;
  const upper = /[A-Z]/;
  const digit = /[0-9]/;
  const special = /[~!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/`]/;

  return (
    lower.test(password) &&
    upper.test(password) &&
    digit.test(password) &&
    special.test(password)
  );
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { nickname, username, password } = createUserDto;
    const user = await this.userRepository.findOne({ where: { username } });
    if (user) {
      throw new BadRequestException('用户名已存在');
    }
    if (!isComplexPassword(password)) {
      throw new BadRequestException(
        '密码必须包含小写字母、大写字母、数字、特殊符号',
      );
    }
    const salt = await genSalt(10);
    const hashStr = await hash(password, salt);

    const newUser = this.userRepository.create({
      nickname,
      username,
      hash: hashStr,
      salt,
    });
    await this.userRepository.save(newUser);
    return {
      nickname: newUser.nickname,
      username: newUser.username,
    };
  }

  findByUsername(username: string) {
    return this.userRepository.findOne({ where: { username } });
  }
}
