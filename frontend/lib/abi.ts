/** Human-readable ABI of contract/contracts/Whiteout.sol (only what the app calls). */
export const WHITEOUT_ABI = [
  "function startRun() returns (uint256 runId)",
  "function move(bytes32 encDir, bytes proof)",
  "function finish(uint256 runId)",
  "function finalize(uint256 runId, bytes cleartexts, bytes decryptionProof)",
  "function activeRunOf(address player) view returns (uint256)",
  "function runCount() view returns (uint256)",
  "function getRun(uint256 runId) view returns (address player, uint8 moves, bool ended, bool finalized)",
  "function getResult(uint256 runId) view returns (tuple(uint8 score, uint64 hazards, uint64 prizes, uint64 path))",
  "function getHandles(uint256 runId) view returns (bytes32 pos, bytes32 alive, bytes32 collected, bytes32 dangerNear, bytes32 prizeNear, bytes32 hazards, bytes32 prizesInitial, bytes32 path, bytes32 score)",
  "event RunStarted(uint256 indexed runId, address indexed player)",
  "event Moved(uint256 indexed runId, uint8 moveIndex)",
  "event RunEnded(uint256 indexed runId)",
  "event RunFinalized(uint256 indexed runId, address indexed player, uint8 score, uint64 hazards, uint64 prizes, uint64 path)",
] as const;

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_HEX = "0xaa36a7";
export const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
export const WHITEOUT_ADDRESS = process.env.NEXT_PUBLIC_WHITEOUT_ADDRESS || "";
