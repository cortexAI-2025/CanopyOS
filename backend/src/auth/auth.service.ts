import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
    });

    const token = this.signToken(user.id, user.email);
    return { token, user: this.sanitizeUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.signToken(user.id, user.email);
    return { token, user: this.sanitizeUser(user) };
  }

  private signToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
    password?: string;
  }) {
    const { password: _password, ...safe } = user as typeof user & {
      password: string;
    };
    return safe;
  }
}
