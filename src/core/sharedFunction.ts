export async function getEthToInrRate(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr');
      const data = await response.json();
      if (!data || !data.ethereum || !data.ethereum.inr) {
        throw new Error('Invalid response from ETH to INR rate API');
      }
      return data.ethereum.inr;
    } catch (error) {
      console.error('Failed to fetch ETH to INR rate:', error);
      throw new Error('Unable to fetch ETH to INR conversion rate');
    }
  }