import { Controller, Get, NotFoundException, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: { user: { id: string } }) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
