import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
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
      throw new UnauthorizedException('用户名或密码错误');
    }
    const isPasswordValid = await compare(password, user.hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.jwtConfiguration.secret,
        expiresIn: this.jwtConfiguration.accessTokenTtl,
      }),
    };
  }
}
