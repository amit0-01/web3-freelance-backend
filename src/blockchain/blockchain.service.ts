import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../jobs/job.entity'; // Adjust the path if needed
import { Contract, JsonRpcProvider, Wallet, ethers,formatEther } from 'ethers';
import { PrismaService } from 'src/databases/prisma.service';
import { User } from 'src/user/user.entity';
import { ApplyJobDto } from 'src/jobs/dto';


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

  async getJobs(search?: string) {
    console.log('Searching for:', search);

    const dbJobs = await this.prisma.job.findMany({
      where: search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              // Uncomment this if you want to search descriptions too
              // { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
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
  async getUserJobs(userId: number) {
    const jobs = await this.prisma.job.findMany({
      where: {
        OR: [
          { employerId: userId },
          { freelancerId: userId },
        ],
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
        payment: jobOnChain.payment.toString(),
        employer: jobOnChain.employer,
        freelancer: jobOnChain.freelancer,
        isCompleted: jobOnChain.isCompleted,
        deliverables : jobInDb.deliverables
      };
    } catch (error: any) {
      throw new Error(`Failed to get job details: ${error.message}`);
    }
  }
  

  // Remove submitProposal as it's not in your contract
  // Add these methods that are in your contract
  async completeJob(jobId: number, user: any) {
    const job = await this.getJobDetails(jobId);
    console.log('job',job);
    console.log('user', user);
    if (job.freelancer.toLowerCase() !== user.walletAddress.toLowerCase()) {
      throw new UnauthorizedException('Not the assigned freelancer');
    }
  
    const tx = await this.contract.completeJob(jobId);
    return tx.wait();
  }

  async releasePayment(jobId: number) {
    if (!this.contract) {
        await this.initializeContract();
    }

    try {
        // 🔹 Call smart contract function
        const tx = await this.contract.releasePayment(jobId);
        const receipt = await tx.wait();
        console.log("Payment released, transaction receipt:", receipt);

        // 🔹 Update job in the database
        await this.prisma.job.update({
            where: { id: jobId },
            data: { payment: 0, isPaid: true },
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

async applyForJob(jobId: number, userId: number, applyJobDto: ApplyJobDto) {
  console.log('jobId', jobId);
  const job = await this.prisma.job.findUnique({
    where: { id: Number(jobId) },
    include: { employer: true, freelancer: true },
  });

  if (!job) {
    throw new BadRequestException('Job not found');
  }

  if (job.employer.id === userId) {
    throw new BadRequestException('Employers cannot apply for their own jobs');
  }

  if (job.freelancer) {
    throw new BadRequestException('Job already has a freelancer');
  }

  await this.prisma.application.create({
    data: {
      jobId: Number(jobId),
      userId: Number(userId),
      coverLetter: applyJobDto.coverLetter,
      proposedRate: applyJobDto.proposedRate,
      estimatedDuration: applyJobDto.estimatedDuration,
      portfolioLink: applyJobDto.portfolioLink,
    },
  });

  return { message: 'Successfully applied for the job', jobId };
}




}