export const STAKING_POOL_ABI = [
  {
    "inputs": [
      { "internalType": "address[]", "name": "collections", "type": "address[]" },
      { "internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]" },
      { "internalType": "uint256", "name": "_planIndex", "type": "uint256" }
    ],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address[]", "name": "collections", "type": "address[]" },
      { "internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]" }
    ],
    "name": "unstake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address[]", "name": "collections", "type": "address[]" },
      { "internalType": "uint256[]", "name": "tokenIds", "type": "uint256[]" }
    ],
    "name": "claimReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserFullState",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "collection", "type": "address" },
          { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
          { "internalType": "uint256", "name": "stakedAt", "type": "uint256" },
          { "internalType": "uint256", "name": "lastClaimTime", "type": "uint256" },
          { "internalType": "uint256", "name": "lockEndTime", "type": "uint256" },
          { "internalType": "uint256", "name": "rewardRate", "type": "uint256" },
          { "internalType": "uint256", "name": "planIndex", "type": "uint256" },
          { "internalType": "address", "name": "owner", "type": "address" }
        ],
        "internalType": "struct StakingPoolV5.StakeInfo[]",
        "name": "stakes",
        "type": "tuple[]"
      },
      { "internalType": "uint256", "name": "totalPending", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "collection", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "isBlacklisted",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export const REFERRAL_MANAGER_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "_referrer", "type": "address" }],
    "name": "register",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];