import { ethers } from "hardhat";

async function main() {
  // Get the contract factory
  const FreelancePlatform = await ethers.getContractFactory("FreelancePlatform");

  // Deploy the contract
  const freelancePlatform = (await FreelancePlatform.deploy()) as Awaited<ReturnType<typeof FreelancePlatform.deploy>>;

  // Wait for the contract to be deployed
  await freelancePlatform.deploymentTransaction()?.wait();

  // Log the deployed contract address
  console.log("FreelancePlatform deployed to:", freelancePlatform.target || freelancePlatform.getAddress());
}

// Run the main function and handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
