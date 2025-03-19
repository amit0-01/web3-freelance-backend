import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity'; // Adjust the path if needed
import { Contract, Interface, JsonRpcProvider, Wallet, ethers } from 'ethers';
import { PrismaService } from 'src/databases/prisma.service';

@Injectable()
export class BlockchainService {
  private readonly provider: JsonRpcProvider;
  private contract: Contract;

  constructor( @InjectRepository(Job)
  private readonly jobRepository: Repository<Job>,
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

   
//   async postJob(title: string, payment: number, userId: number, deadline: Date) {
//     if (!this.contract) {
//       await this.initializeContract();
//     }
  
//     // Convert payment to Wei (BigNumber)
//     const paymentInWei = ethers.parseEther(payment.toString());
  
//     // Send the transaction
//     const tx = await this.contract.postJob(title, paymentInWei, {
//       value: paymentInWei,
//     });
  
//     // Wait for the transaction to be mined
//     const receipt = await tx.wait();
//     console.log("Transaction Receipt:", receipt);
  
//     // Parse logs manually
//     const jobPostedEventFragment = this.contract.interface.getEvent("JobPosted");
//     const jobPostedEventInterface = new Interface([jobPostedEventFragment.format()]);

//     let jobId: number;

// for (const log of receipt.logs) {
//   try {
//     const parsedLog = jobPostedEventInterface.parseLog(log);
//     if (parsedLog.name === "JobPosted") {
//       jobId = Number(parsedLog.args.jobId); // Convert to number
  
//           // 🔹 Save job details in the database
//           const newJob = await this.jobRepository.save({
//             id: jobId, // Save job ID from blockchain
//             title,
//             payment: Number(payment), // Store payment as a number
//             deadline: new Date(deadline), // Ensure proper Date format
//             userId, // Associate the job with a user
//             transactionHash: receipt.transactionHash, // Store transaction hash
//           });
  
//           return newJob;
//         }
//       } catch (error) {
//         console.log("Error parsing log:", (error as any).message);
//       }
//     }
  
//     throw new Error("JobPosted event not found in transaction logs");
// }
async postJob(title: string, payment: number, userId: number, deadline: Date) {
  if (!this.contract) {
    await this.initializeContract();
  }

  const paymentInWei = ethers.parseEther(payment.toString());
  const tx = await this.contract.postJob(title, paymentInWei, {
    value: paymentInWei,
  });

  const receipt = await tx.wait();
  if (receipt.status === 0) {
    throw new Error("Transaction reverted");
  }

  const jobPostedEventAbi = [
    "event JobPosted(uint256 indexed jobId, string title, uint256 payment, address employer)"
  ];
  const jobPostedEventInterface = new ethers.Interface(jobPostedEventAbi);

  let jobId: number | undefined;
  for (const log of receipt.logs) {
    try {
      const parsedLog = jobPostedEventInterface.parseLog(log);
      if (parsedLog && parsedLog.name === "JobPosted") {
        jobId = Number(parsedLog.args.jobId);
        console.log('Transaction Hash:', receipt.transactionHash);

        // 🔹 Save job details in the database with `isPaid: false`
        const newJob = await this.jobRepository.save({
          id: jobId,
          title,
          payment: Number(payment),
          deadline: new Date(deadline),
          userId,
          transactionHash: receipt.transactionHash,
          isPaid: false, // ✅ Payment is locked in the contract, so mark it as unpaid initially
        });

        return newJob;
      }
    } catch (error: any) {
      console.log("Error parsing log:", error.message);
    }
  }

  throw new Error("JobPosted event not found in transaction logs");
}



  async getJobs() {
    if (!this.contract) {
      await this.initializeContract();
    }
    const nextJobId = await this.contract.nextJobId();
    const jobs = [];
    
    // Fetch all jobs
    for (let i = 0; i < nextJobId; i++) {
      const job = await this.contract.jobs(i);
      jobs.push({
        id: job.id.toString(),
        title: job.title,
        payment: job.payment.toString(),
        employer: job.employer,
        freelancer: job.freelancer,
        isCompleted: job.isCompleted
      });
    }
    return jobs;
  }

  async getJobDetails(jobId: number) {
    if (!this.contract) {
      await this.initializeContract();
    }
    try {
      const job = await this.contract.jobs(jobId);
      return {
        id: job.id.toString(),
        title: job.title,
        payment: job.payment.toString(),
        employer: job.employer,
        freelancer: job.freelancer,
        isCompleted: job.isCompleted
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

}