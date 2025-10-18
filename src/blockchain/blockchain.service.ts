import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity'; // Adjust the path if needed
import { Contract, JsonRpcProvider, Wallet, ethers,formatEther } from 'ethers';
import { PrismaService } from 'src/databases/prisma.service';
import { User } from 'src/user/user.entity';
import { ApplyJobDto } from 'src/jobs/dto';
import { ApplicationStatus } from '@prisma/client';


@Injectable()
export class BlockchainService {
  private readonly provider: JsonRpcProvider;
  private contract: Contract;

    constructor(
      @InjectRepository(Job) private readonly jobRepository: Repository<Job>,
      @InjectRepository(User) private readonly userRepository: Repository<User>,
      private readonly prisma : PrismaService) {
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
      this.provider = new JsonRpcProvider(rpcUrl);
    }

  async initializeContract() {
    // You need a private key to sign transactions
    const privateKey = process.env.PRIVATE_KEY; // Add this to your .env
    const wallet = new Wallet(privateKey, this.provider);
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contractABI = JSON.parse(process.env.CONTRACT_ABI || '[]');
    this.contract = new Contract(contractAddress, contractABI, wallet);
  }


  async postJob(
    title: string,
    payment: number,
    employerId: number,
    deadline: Date,
    description: string,
    duration: string,
    category: string[],
    deliverables: string[]
  ) {
    if (!this.contract) {
      await this.initializeContract();
    }

    const paymentInWei = ethers.parseEther(payment.toString());
    const tx = await this.contract.postJob(title, paymentInWei, {
      value: paymentInWei,
    });

    const receipt = await tx.wait();
    if (receipt.status === 0) {
      throw new Error('Transaction reverted');
    }

    const jobPostedEventAbi = [
      'event JobPosted(uint256 indexed jobId, string title, uint256 payment, address employer)',
    ];
    const jobPostedEventInterface = new ethers.Interface(jobPostedEventAbi);

    let jobId: number | undefined;
    for (const log of receipt.logs) {
      try {
        const parsedLog = jobPostedEventInterface.parseLog(log);
        if (parsedLog && parsedLog.name === 'JobPosted') {
          jobId = Number(parsedLog.args.jobId);

          const employer = await this.prisma.user.findUnique({
            where: { id: employerId },
          });

          if (!employer) {
            throw new Error(`Employer with ID ${employerId} not found.`);
          }

          const newJob = await this.prisma.job.create({
            data: {
              id: jobId,
              title,
              payment,
              deadline,
              employerId,
              freelancerId: null,
              isPaid: false,
              description,
              duration,
              category,
              deliverables,
              transactionHash: receipt.hash,
            },
          });

          await this.prisma.payment.create({
            data: {
              amount: payment,
              status: 'pending', 
              type: 'incoming',
              freelancerId: '',
              freelancerName: '',
              jobId: newJob.id,
              transactionHash: receipt.hash,
            },
          })
  

          return newJob;
        }
      } catch (err: any) {
        console.log('Error parsing log:', err.message);
      }
    }

    // throw new Error('JobPosted event not found in logs');
  }



  // async getJobs() {
  //   if (!this.contract) {
  //     await this.initializeContract();
  //   }
  //   const nextJobId = await this.contract.nextJobId();
  //   const jobs = [];
    
  //   // Fetch all jobs
  //   for (let i = 0; i < nextJobId; i++) {
  //     const job = await this.contract.jobs(i);
  //     jobs.push({
  //       id: job.id.toString(),
  //       title: job.title,
  //       payment: job.payment.toString(),
  //       employer: job.employer,
  //       freelancer: job.freelancer,
  //       isCompleted: job.isCompleted
  //     });
  //   }
  //   return jobs;
  // }

  async getJobs(search?: string, category?:string) {
    const whereClause: any = {};

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      // { description: { contains: search, mode: 'insensitive' } }, // optional
    ];
  }

  if (category && category.toLowerCase() !== 'all') {
    whereClause.category = { has: category };
  }
  
  const dbJobs = await this.prisma.job.findMany({
    where: whereClause,
  });

    if (!this.contract) {
      await this.initializeContract();
    }

    const enrichedJobs = await Promise.all(
      dbJobs.map(async (job) => {
        try {
          const onChainJob = await this.contract.jobs(job.id);
          return {
            ...job,
            payment: formatEther(onChainJob.payment), // Convert to Ether
            employer: onChainJob.employer,
            freelancer: onChainJob.freelancer,
            isCompleted: onChainJob.isCompleted,
          };
        } catch (error) {
          console.error(`Error fetching job #${job.id} from contract:`, error);
          return job; // fallback to DB-only version
        }
      })
    );

    return enrichedJobs;
  }

  // GET USER JOBS
  async getUserJobs(userId: number, search?: string) {
    const jobs = await this.prisma.job.findMany({
      where: {
        OR: [
          { employerId: userId },
          { freelancerId: userId },
        ],
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
    });

    if (!this.contract) {
      await this.initializeContract();
    }

    const enrichedJobs = await Promise.all(
      jobs.map(async (job) => {
        try {
          const onChainJob = await this.contract.jobs(job.id);
          return {
            ...job,
            payment: formatEther(onChainJob.payment),
            employer: onChainJob.employer,
            freelancer: onChainJob.freelancer,
            isCompleted: onChainJob.isCompleted,
          };
        } catch (error) {
          console.error(`Error fetching job #${job.id} from contract:`, error);
          return job;
        }
      })
    );

    return enrichedJobs;
  }
  

  async getJobDetails(jobId: number) {
    if (!this.contract) {
      await this.initializeContract();
    }
  
    try {
      const jobOnChain = await this.contract.jobs(jobId);
      const jobInDb = await this.prisma.job.findUnique({
        where: { id: Number(jobId) },
      });

  
      if (!jobInDb) {
        throw new Error(`Job with ID ${jobId} not found in database`);
      }
  
      return {
        id: jobOnChain.id.toString(),
        title: jobInDb.title,
        description: jobInDb.description,
        category: jobInDb.category,
        payment: formatEther(jobOnChain.payment),
        employer: jobOnChain.employer,
        freelancer: jobOnChain.freelancer,
        isCompleted: jobOnChain.isCompleted,
        deliverables : jobInDb.deliverables,
        duration : jobInDb.duration,
        deadline : jobInDb.deadline
      };
    } catch (error: any) {
      throw new Error(`Failed to get job details: ${error.message}`);
    }
  }
  

  // Remove submitProposal as it's not in your contract
  // Add these methods that are in your contract
  async completeJob(jobId: number, user: any) {
    const job = await this.prisma.job.findUnique({
      where: { id: Number(jobId) },
    });
  
    if (!job) throw new NotFoundException('Job not found');
  
    if (job.freelancerId === null) {
      throw new UnauthorizedException('Job has no freelancer assigned');
    }
  
    const freelancer = await this.prisma.user.findUnique({
      where: { id: job.freelancerId },
    });
  
    if (!freelancer || freelancer.walletAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
      throw new UnauthorizedException('You are not authorized to complete this job');
    }
  
    // ✅ Only update DB — no contract call here
    await this.prisma.job.update({
      where: { id: Number(jobId) },
      data: {
        isCompleted: true,
      },
    });
  
    await this.prisma.payment.updateMany({
      where: {
        jobId: job.id,
        type: 'incoming',
      },
      data: {
        status: 'ready_to_release',
      },
    });
  
    return { success: true };
  }
  

  // PAYMENTS WHICH ARE READY TO RELEASE

  async getPaymentsByStatus(status?: string) {
    try {
      const whereClause = status && status !== 'all'
        ? { status }
        : undefined; // No filtering if status is not provided or is 'all'
  
      const payments = await this.prisma.payment.findMany({
        where: whereClause,
        include: {
          job: {
            include: {
              employer: true,
              freelancer: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
  
      return payments;
    } catch (error) {
      console.error("Error fetching payments by status:", error);
      throw new Error("Failed to fetch payments");
    }
  }
  

  // GET CLIENT ACTIVE JOBS
  async getClientActiveJobs(userId: number) {
    return await this.prisma.job.findMany({
      where: {
        employerId: userId,
        isCompleted: false,
      },
      include: {
        employer: true,
        freelancer: true,
      },
    });
  }

  // GET FREELANCER ACTIVE JOBS
  async getFreelancerActiveJobs(userId: number) {
    return await this.prisma.job.findMany({
      where: {
        freelancerId: userId,
        isCompleted: false,
      }, 
      include: {
        employer: true,
        freelancer: true,
      },
    });
  }

  // GET FREELANCER ACTIVE PAYMENTS
  async getClientActivePayments(userId: number) {
    return await this.prisma.payment.findMany({
      where: {
        job: {
          employerId: userId,
        },
        status: 'pending', 
      },
      include: {
        job: {
          include: {
            employer: true,
            freelancer: true,
          },
        },
      },
    });
  }
  
  // GET FREELANCER ACTIVE PAYMENTS
  async getFreelancerActivePayments(userId: number) {
    return await this.prisma.payment.findMany({
      where: {
        job: {
          freelancerId: userId,
        },
        status: 'PENDING',
      },
      include: {
        job: {
          include: {
            employer: true,
          },
        },
      },
    });
  }
  
  
  

  async releasePayment(jobId: number) {
    if (!this.contract) {
        await this.initializeContract();
    }

    try {
        // 🔹 Call smart contract function
        const tx = await this.contract.releasePayment(jobId);
        const receipt = await tx.wait();

        // 🔹 Update job in the database
        await this.prisma.job.update({
            where: { id: Number(jobId) },
            data: { payment: 0, isPaid: true },
        });

         // 🔹 Update payment(s) in the database
        await this.prisma.payment.updateMany({
          where: { jobId: Number(jobId), status: { not: 'released' } },
          data: {
            status: 'released',
            transactionHash: receipt.transactionHash,
          },
        });

        return { success: true, transactionHash: receipt.transactionHash };
    } catch (error) {
        console.error("Error releasing payment:", error);
        throw new Error("Payment release failed");
    }
}

// GET WALLET BALANCE
async getWalletBalance(walletAddress: string): Promise<string> {
  try {
    const balance = await this.provider.getBalance(walletAddress);
    return ethers.formatEther(balance); 
  } catch (error:any) {
    throw new Error(`Error fetching balance: ${error.message}`);
  }
}

// APPLY JOB 

async applyForJob(jobId: number | string, userId: number, applyJobDto: ApplyJobDto) {
  const jobIdNum = Number(jobId);

  if (isNaN(jobIdNum)) {
    throw new BadRequestException('Invalid job ID');
  }

  const job = await this.prisma.job.findUnique({
    where: { id: jobIdNum },
    include: { employer: true },
  });

  if (!job) {
    throw new BadRequestException('Job not found');
  }

  if (job.employer.id === userId) {
    throw new BadRequestException('Employers cannot apply for their own jobs');
  }
  if (job.freelancerId) {
    throw new BadRequestException('This job already has a freelancer assigned');
  }

  const [application, updatedJob] = await this.prisma.$transaction([
    this.prisma.application.create({
      data: {
        jobId: jobIdNum,
        userId,
        coverLetter: applyJobDto.coverLetter,
        proposedRate: applyJobDto.proposedRate,
        estimatedDuration: applyJobDto.estimatedDuration,
        portfolioLink: applyJobDto.portfolioLink,
      },
    }),
    this.prisma.job.update({
      where: { id: jobIdNum },
      data: { freelancerId: userId },
    }),
  ]);

    // Get freelancer wallet address
    const freelancer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true },
    });
  
    if (!freelancer || !freelancer.walletAddress) {
      throw new BadRequestException('Freelancer wallet address not found');
    }

  return { application, updatedJob };
}






async getUserApplications(userId: number) {
  return await this.prisma.application.findMany({
    where: { userId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          description: true,
          payment: true,
          isPaid: true,
          isCompleted: true,
          employer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}


async getUserApplicationById(userId: number, applicationId: number) {
  return await this.prisma.application.findFirst({
    where: {
      id: applicationId,
      userId, // Ensure user can only access their own applications
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          description: true,
          payment: true,
          isPaid: true,
          isCompleted: true,
          employer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}


// GET EMPLOYER APPLICATIONS OF THEIR JOBS

async getApplicationsForEmployer(employerId: number) {
  return await this.prisma.job.findMany({
    where: {
      employerId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      applications: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              // Add other fields if needed
            },
          },
        },
      },
    },
  });
}

// UPDATE STATUS OF JOB APPLICATION
async updateStatus(id: number | string, status: ApplicationStatus, userId: number) {
  if (!this.contract) {
    await this.initializeContract();
}
  const applicationId = Number(id);
  if (isNaN(applicationId)) {
    throw new BadRequestException('Invalid application ID');
  }

  const application = await this.prisma.application.findUnique({ 
    where: { id: applicationId }, 
    include: { job: true, user: true } // include freelancer data
  });

  if (!application || application.job.employerId !== userId) {
    throw new ForbiddenException('You are not allowed to update this application');
  }

  const updated = await this.prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });

  if (status === 'ACCEPTED') {
    // 1. Update freelancerId in DB
    await this.prisma.job.update({
      where: { id: Number(application.jobId) },
      data: { freelancerId: application.userId },
    });
    // 2. Assign on-chain (must be called by employer, and this function is guarded with their JWT)
    const tx = await this.contract.assignFreelancer(application.jobId, application.user.walletAddress);
    await tx.wait();
  }

  return updated;
}

}