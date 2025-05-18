// payment.service.ts
import { Injectable } from '@nestjs/common';
import { Contract, ethers, JsonRpcProvider, Wallet } from 'ethers';
import { PrismaService } from 'src/databases/prisma.service';

@Injectable()
export class PaymentService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private jobContact : ethers.Contract;
  private signer: ethers.Wallet;


  constructor(
    // @InjectRepository(Job) private readonly jobRepository: Repository<Job>,
    // @InjectRepository(User) private readonly userRepository: Repository<User>,
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

  async releasePayment(paymentId: string) {
    if(!this.contract){
      this.initializeContract();
    }
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { job: true },
    });
  
    if (!payment) {
      throw new Error('Payment not found');
    }
  
    if (payment.status !== 'completed') {
      throw new Error('Payment not ready for release');
    }
  
    // Interact with smart contract
  
    const tx = await this.contract.releasePayment(payment.job.id);
    const receipt = await tx.wait();
  
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'released',
        transactionHash: receipt.transactionHash,
      },
    });
  
    return updated;
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


  // GET ALL PAYMENTS
  async getAll() {
    return this.prisma.payment.findMany({
      include: { job: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
