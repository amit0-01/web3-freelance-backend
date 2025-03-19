import { Controller, Post, Body, UseGuards, Request, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserService } from 'src/user/user.service';
import bcrypt from 'bcrypt';
import { ethers } from "ethers"



@Controller('auth')
export class AuthController {
  constructor(
  private readonly authService: AuthService,
  private userService : UserService) {}

  @Post('register')
  async register(@Body() userData: { email: string; password: string; walletAddress: string }) {
    const existingUser = await this.userService.findByEmail(userData.email);
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    return this.userService.create({
      ...userData,
      password: hashedPassword,
    });
  }
  

  @Post('login')
  async login(@Body() loginDto: any) {
    const { email, password } = loginDto;
    const user = await this.authService.validateUser(email, password);
    return this.authService.login(user);
  }

  // FOR METAMASK LOGIN
  
  @Post("web3-login")
  async web3Login(
    @Body() { walletAddress, signature }: { walletAddress: string; signature: string }
  ) {
    return this.authService.web3Login(walletAddress, signature);
  }



  @UseGuards(JwtAuthGuard)
  @Post('profile')
  async getProfile(@Request() req: any) {
    return req.user; 
  }
}
