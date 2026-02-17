import { Injectable, OnModuleInit } from '@nestjs/common';
import { Contract, Wallet, JsonRpcProvider, formatEther } from 'ethers';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private contract: Contract;
  private provider: JsonRpcProvider;

  onModuleInit() {
    this.initializeContract();
  }

  private initializeContract() {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contractABI = JSON.parse(process.env.CONTRACT_ABI || '[]');

    this.provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey!, this.provider);

    this.contract = new Contract(contractAddress, contractABI, wallet);
  }

  getContract(): Contract {
    return this.contract;
  }

  formatPayment(payment: bigint | string) {
    return formatEther(payment);
  }
}
