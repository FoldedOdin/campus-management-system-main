import { BrowserProvider, Contract, sha256, toUtf8Bytes } from 'ethers';

const ELECTION_REGISTRY_ABI = [
  'function createElection(string name, uint256 startTime, uint256 endTime) external returns (uint256)',
  'function commitVote(uint256 electionId, bytes32 commitment, bytes32 voterNullifier) external'
];

const RAW_REGISTRY_ADDRESS = process.env.REACT_APP_ELECTION_REGISTRY_ADDRESS || '';
const ELECTION_ID_RAW = process.env.REACT_APP_BLOCKCHAIN_ELECTION_ID || '';
const REQUIRED_CHAIN_ID_RAW = process.env.REACT_APP_BLOCKCHAIN_CHAIN_ID || '';
const EXPLORER_TX_URL_RAW = process.env.REACT_APP_BLOCK_EXPLORER_TX_URL || '';

const isAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value || '');
const isUintString = (value) => /^[0-9]+$/.test(value || '');

const toBytes32 = (value) => sha256(toUtf8Bytes(value));

const normalizeChainIdHex = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return `0x${trimmed.slice(2).toLowerCase()}`;
  }
  if (/^[0-9]+$/.test(trimmed)) {
    return `0x${Number(trimmed).toString(16)}`;
  }
  return '';
};

const normalizeRegistryAddress = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const matches = raw.match(/0x[a-fA-F0-9]{40}/g) || [];
  if (matches.length === 0) return '';
  if (matches.length > 1) {
    console.warn('Multiple contract addresses found in env; using the last one.');
  }
  return matches[matches.length - 1];
};

const REGISTRY_ADDRESS = normalizeRegistryAddress(RAW_REGISTRY_ADDRESS);

const getElectionId = () => {
  if (!ELECTION_ID_RAW || !isUintString(ELECTION_ID_RAW)) {
    throw new Error('Invalid REACT_APP_BLOCKCHAIN_ELECTION_ID value');
  }

  // Keep as decimal string; ethers accepts BigNumberish strings.
  return ELECTION_ID_RAW;
};

const buildTxUrl = (txHash) => {
  if (!txHash) return '';
  const base = String(EXPLORER_TX_URL_RAW || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  return `${base}/${txHash}`;
};

export const isBlockchainVoteEnabled = () => {
  try {
    getElectionId();
    const normalizedChainId = normalizeChainIdHex(REQUIRED_CHAIN_ID_RAW);
    return isAddress(REGISTRY_ADDRESS) && (!REQUIRED_CHAIN_ID_RAW || !!normalizedChainId);
  } catch {
    return false;
  }
};

const ensureExpectedChain = async () => {
  const expectedChainId = normalizeChainIdHex(REQUIRED_CHAIN_ID_RAW);
  if (!expectedChainId || !window.ethereum) return;

  const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (String(currentChainId).toLowerCase() === expectedChainId.toLowerCase()) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: expectedChainId }]
    });
  } catch (switchErr) {
    throw new Error(
      `Wrong MetaMask network. Please switch to chain ${expectedChainId} and try again.`
    );
  }
};

export const commitVoteOnChain = async ({ voterId, candidateId, positionId }) => {
  if (!isAddress(REGISTRY_ADDRESS)) {
    throw new Error('Blockchain contract address is not configured');
  }

  if (!window.ethereum) {
    throw new Error('No wallet found. Please install MetaMask.');
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });
  await ensureExpectedChain();

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const walletAddress = await signer.getAddress();
  const electionId = getElectionId();
  const normalizedWallet = (walletAddress || '').toLowerCase();
  const normalizedRegistry = (REGISTRY_ADDRESS || '').toLowerCase();

  if (normalizedWallet === normalizedRegistry) {
    throw new Error('Invalid blockchain setup: contract address matches wallet address.');
  }

  const code = await provider.getCode(REGISTRY_ADDRESS);
  if (!code || code === '0x') {
    const activeChainId = await window.ethereum.request({ method: 'eth_chainId' });
    throw new Error(
      `Invalid blockchain setup: no contract deployed at ${REGISTRY_ADDRESS} on chain ${activeChainId}.`
    );
  }

  const voterNullifier = toBytes32(
    `nullifier:${electionId}:${voterId}:${positionId}`
  );

  const commitment = toBytes32(
    `vote:${electionId}:${candidateId}:${positionId}:${Date.now()}`
  );

  try {
    const contract = new Contract(REGISTRY_ADDRESS, ELECTION_REGISTRY_ABI, signer);
    const tx = await contract.commitVote(electionId, commitment, voterNullifier);
    const receipt = await tx.wait();

    return {
      txHash: tx.hash,
      txUrl: buildTxUrl(tx.hash),
      blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : null,
      commitment,
      voterNullifier,
      walletAddress,
      contractAddress: REGISTRY_ADDRESS,
      electionId
    };
  } catch (err) {
    const rpcMessage = err?.info?.error?.message || err?.message || '';
    const rpcLower = String(rpcMessage).toLowerCase();
    if (rpcLower.includes('external transactions to internal accounts')) {
      throw new Error('Wallet rejected transaction: configured contract address is not a smart contract.');
    }
    if (rpcLower.includes('election not found')) {
      throw new Error(
        `Election ID ${electionId} not found in contract. Create election first or set REACT_APP_BLOCKCHAIN_ELECTION_ID correctly.`
      );
    }
    if (rpcLower.includes('election not started')) {
      throw new Error('Blockchain election has not started yet.');
    }
    if (rpcLower.includes('election ended')) {
      throw new Error('Blockchain election has already ended.');
    }
    if (rpcLower.includes('already voted')) {
      throw new Error('Blockchain rejected vote: this voter already voted for this position.');
    }
    throw err;
  }
};

export const createElectionOnChain = async ({ name, startTime, endTime }) => {
  if (!isAddress(REGISTRY_ADDRESS)) {
    throw new Error('Blockchain contract address is not configured');
  }

  if (!window.ethereum) {
    throw new Error('No wallet found. Please install MetaMask.');
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });
  await ensureExpectedChain();

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const walletAddress = await signer.getAddress();
  const normalizedWallet = (walletAddress || '').toLowerCase();
  const normalizedRegistry = (REGISTRY_ADDRESS || '').toLowerCase();

  if (normalizedWallet === normalizedRegistry) {
    throw new Error('Invalid blockchain setup: contract address matches wallet address.');
  }

  const code = await provider.getCode(REGISTRY_ADDRESS);
  if (!code || code === '0x') {
    const activeChainId = await window.ethereum.request({ method: 'eth_chainId' });
    throw new Error(
      `Invalid blockchain setup: no contract deployed at ${REGISTRY_ADDRESS} on chain ${activeChainId}.`
    );
  }

  try {
    const contract = new Contract(REGISTRY_ADDRESS, ELECTION_REGISTRY_ABI, signer);
    const tx = await contract.createElection(name, startTime, endTime);
    const receipt = await tx.wait();

    // Get the election ID from the event logs
    const electionCreatedEvent = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === 'ElectionCreated';
      } catch {
        return false;
      }
    });

    let electionId = null;
    if (electionCreatedEvent) {
      const parsed = contract.interface.parseLog(electionCreatedEvent);
      electionId = Number(parsed.args.electionId);
    }

    return {
      txHash: tx.hash,
      txUrl: buildTxUrl(tx.hash),
      blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : null,
      electionId,
      walletAddress,
      contractAddress: REGISTRY_ADDRESS
    };
  } catch (err) {
    const rpcMessage = err?.info?.error?.message || err?.message || '';
    const rpcLower = String(rpcMessage).toLowerCase();
    if (rpcLower.includes('external transactions to internal accounts')) {
      throw new Error('Wallet rejected transaction: configured contract address is not a smart contract.');
    }
    throw err;
  }
};
