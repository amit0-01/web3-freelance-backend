import { Controller, Post, Get, Body, Param, Req, UseGuards, BadRequestException, Query, Patch } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApplyJobDto } from '../jobs/dto';
import { ApplicationStatus } from '@prisma/client';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @UseGuards(JwtAuthGuard)
  @Post('jobs')
  async postJob(
    @Body()
    data: {
      title: string
      payment: number
      deadline: string
      description: string
      duration: string
      category: string[]
      deliverables: string[]
    },    
    @Req() req: any
  ) {
    const userId = req.user.id; 
    const deadline = new Date(data.deadline);
    
    return await this.blockchainService.postJob(
      data.title,
      data.payment,
      userId,
      deadline,
      data.description,
      data.duration,
      data.category,
      data.deliverables
    );  
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('jobs')
  async getJobs(@Query('search') search?: string,   @Query('category') category?: string) {
    return await this.blockchainService.getJobs(search, category);
  }

  @UseGuards(JwtAuthGuard)
  @Get('jobs/user-jobs')
  async getUserJobs(@Req() req: any, @Query('search') search?: string) {
    const id = req.user.id;
    return await this.blockchainService.getUserJobs(id, search);
  }

  @UseGuards(JwtAuthGuard)
  @Get('payments')
  async getPayments(@Query('status') status: string) {
    return await this.blockchainService.getPaymentsByStatus(status);
  }

  @UseGuards(JwtAuthGuard)
  @Get('active-jobs')
  async getActiveJobs(@Req() req: any, @Query('role') role: string) {
    const userId = req.user.id;
  
    if (role == 'CLIENT') {
      return await this.blockchainService.getClientActiveJobs(userId);
    } else if (role == 'FREELANCER') {
      return await this.blockchainService.getFreelancerActiveJobs(userId);
    } else {
      throw new BadRequestException('Invalid role specified');
    }
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('active-payments')
  async getActivePayments(@Req() req: any, @Query('role') role: string) {
    const userId = req.user.id;

  if (role === 'CLIENT') {
    return await this.blockchainService.getClientActivePayments(userId);
  } else if (role === 'FREELANCER') {
    return await this.blockchainService.getFreelancerActivePayments(userId);
  } else {
    throw new BadRequestException('Invalid role specified');
  }
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
  async applyForJob(
  @Param('id') jobId: number,
  @Body() applyJobDto: ApplyJobDto,
  @Req() req: any
) {
  const userId = req.user.id;
  return await this.blockchainService.applyForJob(jobId, userId, applyJobDto);
}

// SEE JOB APPLICATIONS FOR USERS APPLIED

@UseGuards(JwtAuthGuard)
@Get('applications/me')
  async getMyApplications(@Req() req: any) {
  const userId = req.user.id;
  return await this.blockchainService.getUserApplications(userId);
}

// FOR SEPEDCIFIC APPLICATION

@UseGuards(JwtAuthGuard)
@Get('applications/me/:id')
async getMyApplicationById(@Req() req: any, @Param('id') id: string) {
  const userId = req.user.id;
  const applicationId = parseInt(id);

  return await this.blockchainService.getUserApplicationById(userId, applicationId);
}


@UseGuards(JwtAuthGuard)
@Get('applications/employer')
async getApplicationsForEmployer(@Req() req: any) {
  const employerId = req.user.id;
  return await this.blockchainService.getApplicationsForEmployer(employerId);
}


@UseGuards(JwtAuthGuard)
@Post(':id/status')
async updateStatus(
  @Param('id') id: number,
  @Body('status') status: ApplicationStatus,
  @Req() req,
) {
  console.log('status',status);
  console.log('id',id);
  const userId = req.user.id;
  return this.blockchainService.updateStatus(id, status, userId);
}

// // COMPLETE JOB
// @Post('complete-job/:jobId')
// async completeJob(@Param('jobId') jobId: string) {
//   const txHash = await this.freelanceService.completeJob(Number(jobId));
//   return { success: true, txHash };
// }
}