import * as dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {}, // Local Hardhat network
    sepolia: { // Sepolia testnet configuration
      url: process.env.BLOCKCHAIN_RPC_URL!, // Ensure this is set
      accounts: [process.env.PRIVATE_KEY!], // Ensure this is set
    },
  },
};

export default config;
