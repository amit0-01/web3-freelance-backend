import { Controller, Get, Post, Req, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Req() req) {
        return this.userService.getProfile(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('update-profile')
    async updateProfile(@Req() req, @Body() body: any) {
    const userId = req.user.id;
    const response = await this.userService.updateProfile(userId, body);

    return {
        statusCode: response.statusCode,
        status: response.status,
        message: response.message,
        ...(response.status === 'success' ? { data: response.data } : { error: response.error }),
    };
}   
}
