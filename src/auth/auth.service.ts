import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SignInDto } from './signIn.dto';
import { UserService } from 'src/user/user.service';
import { compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { type ConfigType } from '@nestjs/config';
import jwtConfig from 'src/config/jwt.config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async signIn(signInDto: SignInDto) {
    const { username, password } = signInDto;
    const user = await this.userService.findByUsername(username);
    if (!user) {
      throw new BadRequestException('用户名或密码错误');
    }
    const isPasswordValid = await compare(password, user.hash);
    if (!isPasswordValid) {
      throw new BadRequestException('用户名或密码错误');
    }
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.jwtConfiguration.secret,
        expiresIn: this.jwtConfiguration.accessTokenTtl,
      }),
    };
  }

  getInfo(authHeader: string): { username: string } {
    if (!authHeader) {
      throw new UnauthorizedException('未登录或Token无效');
    }
    const token = authHeader.split(' ')[1]; // 提取 Bearer token
    if (!token) {
      throw new UnauthorizedException('未登录或Token无效');
    } else {
      // 验证token
      const decoded = this.jwtService.verify(token);
      if (!decoded) {
        throw new UnauthorizedException('未登录或Token无效');
      } else {
        return decoded;
      }
    }
  }
}
