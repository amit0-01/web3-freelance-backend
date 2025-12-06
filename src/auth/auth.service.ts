import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { ethers } from 'ethers';
import { Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';


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

  async guestLogin() {
    const guestId = `guest_${uuidv4()}`;
    const guestEmail = `${guestId}@guest.local`;

    const guestUser = await this.userService.create({
      email: guestEmail,
      password: await bcrypt.hash(uuidv4(), 10), 
      role: 'FREELANCER', 
      isGuest: true,
    });

    const payload = {
      email: guestUser.email,
      sub: guestUser.id,
      role: guestUser.role,
      isGuest: true,
    };

    return {
      success: true,
      accessToken: this.jwtService.sign(payload),
      user: {
        id: guestUser.id,
        email: guestUser.email,
        role: guestUser.role,
        isGuest: true,
      },
    };
  }

  async loginWithGoogle(googleUser: any) {
    const userId = googleUser.providerId; 

    const payload = {
      sub: userId,
      email: googleUser.email,
      name: googleUser.name,
    };

    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      user: payload,
    };
  }
}
