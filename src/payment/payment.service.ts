// payment.service.ts
import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';

@Injectable()
export class PaymentService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private jobContact : ethers.Contract;
  private signer: ethers.Wallet;


  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

    // Signer must hold the private key of the client (or owner of the job)
    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);

    const JobEscrowABI = JSON.parse(process.env.JobEscrowABI);
    const contractABI = JSON.parse(process.env.CONTRACT_ABI)

    this.contract = new ethers.Contract(
      process.env.ESCROW_CONTRACT_ADDRESS!,
      JobEscrowABI,
      this.signer // Use signer to send transactions
    );

    this.jobContact = new ethers.Contract(
      process.env.CONTRACT_ADDRESS!,
      contractABI,
      this.signer // Use signer to send transactions
    );
  }




  async releasePayment(jobId: number) {
    const tx = await this.contract.releasePayment(jobId);
    await tx.wait();
    return { txHash: tx.hash };
  }

  async refundPayment(jobId: number) {
    const tx = await this.contract.refundPayment(jobId);
    await tx.wait();
    return { txHash: tx.hash };
  }

  async listenToEvents() {
    this.contract.on("PaymentReleased", async (jobId, freelancer) => {
      console.log(`Payment released for job ${jobId} to ${freelancer}`);

      // You can update your DB here:
      // await this.jobsRepository.update(jobId, { status: "released" });
    });

    this.contract.on("JobCreated", (jobId, client, freelancer, amount) => {
      console.log(`New job created: ${jobId}, amount: ${ethers.formatEther(amount)}`);
    });
  }

  async getJobDetails(jobId: number) {
    const job = await this.jobContact.jobs(jobId);
    console.log('job', job)
    return {
      client: job.client,
      freelancer: job.freelancer,
      amount: job.amount, 
      status: job.status,
    };    
  }
}
