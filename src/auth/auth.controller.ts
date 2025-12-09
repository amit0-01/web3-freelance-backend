import { Controller, Post, Body, UseGuards, BadRequestException, UnauthorizedException, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { AuthGuard } from '@nestjs/passport';



@Controller('auth')
export class AuthController {
  constructor(
  private readonly authService: AuthService,
  private userService : UserService) {}

  @Post('register')
async register(
  @Body() userData: { email: string; password: string; walletAddress?: string; role?: 'FREELANCER' | 'CLIENT' }
) {
  const existingUser = await this.userService.findByEmail(userData.email);
  if (existingUser) {
    throw new BadRequestException('Email already exists');
  }

  const role = userData.role ?? 'FREELANCER';

  return this.authService.register({ ...userData, role });
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

  // GUEST LOGIN
  @Post("guest-login")
  async guestLogin() {
    return this.authService.guestLogin();
  }

  // LOGIN WITH GOOGLE 

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // passport redirects automatically
  }

  // Step 2: Google redirects here
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
  
  const { accessToken, user } = await this.authService.loginWithGoogle(req.user);  
  
  const responseData = {
    success: true,
    message: "Login successful",
    accessToken,
    user
  };

  const encodedData = Buffer.from(JSON.stringify(responseData)).toString('base64');  
  const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?data=${encodedData}`;
  return res.redirect(redirectUrl);
}

}
