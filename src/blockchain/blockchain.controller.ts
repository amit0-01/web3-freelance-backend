import { Controller, Post, Get, Body, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @UseGuards(JwtAuthGuard)
  @Post('jobs')
  async postJob(
    @Body() data: { title: string; payment: number; deadline: string }, 
    @Req() req: any
  ) {
    const userId = req.user.id; // Extract user ID from authenticated user
    const deadline = new Date(data.deadline); // Ensure it's a valid date
    
    return await this.blockchainService.postJob(data.title, data.payment, userId, deadline);
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('jobs')
  async getJobs() {
    return await this.blockchainService.getJobs();
  }

  @UseGuards(JwtAuthGuard)
  @Get('jobs/:id')
  async getJobDetails(@Param('id') id: number) {
    return await this.blockchainService.getJobDetails(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('jobs/:id/complete')
  async completeJob(@Param('id') jobId: number, @Req() req: any) {
    const user = req.user; 
    console.log('user',user);
    return await this.blockchainService.completeJob(jobId, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('jobs/:id/release-payment')
  async releasePayment(@Param('id') jobId: number) {
    return await this.blockchainService.releasePayment(jobId);
  }
 
  // GET WALLET BALANCE
  @Get("balance/:walletAddress")
  async getBalance(@Param("walletAddress") walletAddress: string) {
    if (!walletAddress) {
      throw new BadRequestException("Wallet address is required");
    }

    const balance = await this.blockchainService.getWalletBalance(walletAddress);
    return { walletAddress, balance };
  }

  // APPLY JOB 
  @UseGuards(JwtAuthGuard)
  @Post('jobs/:id/apply')
  async applyForJob(@Param('id') jobId: number, @Req() req: any) {
  const userId = req.user.id; // Get logged-in user ID
  return await this.blockchainService.applyForJob(jobId, userId);
  }

}