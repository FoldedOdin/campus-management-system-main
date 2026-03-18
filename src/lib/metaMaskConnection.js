import { ethers } from 'ethers';

// Function to connect to MetaMask and get signer
export const connectToMetaMask = async () => {
  try {
    // Check if MetaMask is installed
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask and try again.');
    }

    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    // Connect to MetaMask
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Get account address
    const address = await signer.getAddress();

    console.log('Connected to MetaMask:', address);
    return { provider, signer, address };
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
    throw error;
  }
};

// Example usage:
// connectToMetaMask().then(({ provider, signer, address }) => {
//   console.log('Signer:', signer);
//   console.log('Address:', address);
// }).catch(console.error);