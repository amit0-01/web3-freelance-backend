import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { ethers } from 'ethers';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result; 
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      walletAddress: user.walletAddress,
    };
  
    return {
      success: true,
      message: 'Login successful',
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        name: user.name, 
      }
    };
  
  }

  // web3 login
  async web3Login(walletAddress: string, signature: string) {
    const message = `Sign in with your wallet: ${walletAddress}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);
  
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new UnauthorizedException("Invalid signature");
    }
  
    let user = await this.userService.findByWallet(walletAddress);
    if (!user) {
      user = await this.userService.createUserWithWallet(walletAddress);
    }
  
    const payload = { sub: user.id, walletAddress: user.walletAddress };
    const accessToken = this.jwtService.sign(payload);
  
    return { accessToken, user };
  }

  async register(userData: { email: string; password: string; walletAddress?: string; role: 'FREELANCER' | 'CLIENT' }) {
    console.log('userData', userData)
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return this.userService.create({ ...userData, password: hashedPassword, role: userData.role as Role });
  }
}
