import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/databases/prisma.service';
import { Prisma, User } from '@prisma/client'; // Use Prisma types

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { jobs: true },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    console.log('userData', userData);
    const user = await this.prisma.user.create({
      data: userData as Prisma.UserCreateInput,
      include: { jobs: true },
    });
    console.log('user', user);
    return user;
  }

  async findByWallet(walletAddress: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { walletAddress },
      include: { jobs: true },
    });
  }

  async createUserWithWallet(walletAddress: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        walletAddress,
        name: 'Web3 User',
        email: `wallet-${walletAddress}@example.com`,
        password: 'securepassword',
        jobs: { create: [] },
      },
      include: { jobs: true },
    });
  }
}