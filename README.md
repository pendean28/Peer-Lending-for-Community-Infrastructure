# 💧 Peer-Lending for Community Infrastructure

Welcome to an innovative Web3 platform that empowers communities to fund and build small-scale infrastructure projects, like water wells in underserved areas, through peer-to-peer lending! Lenders contribute crypto funds, while borrowers repay not with traditional interest, but with community service tokens earned through verifiable contributions. Built on the Stacks blockchain using Clarity smart contracts, this ensures transparency, immutability, and trustless execution.

## ✨ Features
🌍 Fund real-world projects like water wells, solar panels, or community gardens  
💰 Peer-lending with crypto (e.g., STX or SIP-10 tokens)  
🛠 Repayment via community service tokens (CST) – earned through logged service hours or contributions  
🔒 Transparent escrow and verification to ensure project completion  
🗳 Community governance for proposal approvals  
📊 Token rewards for lenders based on service repayments  
🚫 Fraud prevention with oracle-verified milestones  
✅ Scalable for global impact in developing regions  

## 🛠 How It Works
This project uses 8 Clarity smart contracts to handle the full lifecycle of lending, project execution, and repayment. Here's a breakdown:

### Smart Contracts Overview
1. **ProposalContract**: Allows borrowers (e.g., community leaders) to submit project proposals, including details like cost, timeline, and expected impact.  
2. **LendingPoolContract**: Manages pooled funds from multiple lenders, tracking contributions and interest in CST tokens.  
3. **EscrowContract**: Holds lent funds in escrow until project milestones are verified, releasing them incrementally.  
4. **ServiceTokenContract**: Defines the fungible CST token (using Clarity's FT traits) for repayments, with minting tied to verified service.  
5. **VerificationOracleContract**: Integrates with off-chain oracles to confirm real-world milestones, like well construction photos or GPS data.  
6. **RepaymentContract**: Handles token-based repayments, converting service logs into CST and distributing to lenders.  
7. **GovernanceContract**: Enables token holders to vote on proposal approvals, amendments, or disputes.  
8. **UserRegistryContract**: Registers and verifies users (lenders/borrowers) with KYC-like traits to prevent sybil attacks.  

**For Lenders**  
- Browse active proposals via the ProposalContract.  
- Contribute funds to a project through the LendingPoolContract.  
- Funds are locked in EscrowContract until verified.  
- Receive CST tokens as repayment, which can be staked or traded for value in the ecosystem.  

**For Borrowers (Communities)**  
- Submit a proposal with details (e.g., "Build a water well in Village X for 5 STX").  
- Once funded and approved via GovernanceContract, access funds from escrow upon milestone verification.  
- Log community service (e.g., maintenance hours) to mint CST via ServiceTokenContract.  
- Repay lenders through RepaymentContract by transferring CST.  

**For Verifiers/Community**  
- Use VerificationOracleContract to submit proof of project completion.  
- Check repayment status or vote on governance issues anytime.  

This solves real-world problems like access to clean water in remote areas by democratizing funding, reducing reliance on centralized aid, and incentivizing sustainable community involvement. Deploy on Stacks for Bitcoin-secured transactions!