import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/databases/prisma.service';
import { Prisma, User } from '@prisma/client'; // Use Prisma types

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { 
        employerJobs: true,  // ✅ Use the correct relation field name
        freelancerJobs: true // ✅ Include freelancer jobs
      },
    });
  }

  async create(userData: Partial<User>): Promise<User> {  
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        walletAddress: userData.walletAddress,
        role: userData.role ?? 'FREELANCER',
        name: userData.name || 'New User',
      },
      include: { 
        employerJobs: true,  
        freelancerJobs: true  
      },
    });
  
    return user;
  }
  
  async findByWallet(walletAddress: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { walletAddress },
      include: { 
        employerJobs: true, 
        freelancerJobs: true 
      },
    });
  }
  
  async createUserWithWallet(walletAddress: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        walletAddress,
        name: 'Web3 User',
        email: `wallet-${walletAddress}@example.com`,
        password: 'securepassword',
      },
      include: { 
        employerJobs: true, 
        freelancerJobs: true 
      },
    });
  }
}