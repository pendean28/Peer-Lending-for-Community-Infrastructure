import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PROPOSAL_ID = 101;
const ERR_INVALID_AMOUNT = 102;
const ERR_POOL_ALREADY_EXISTS = 103;
const ERR_POOL_NOT_FOUND = 104;
const ERR_INSUFFICIENT_FUNDS = 105;
const ERR_INVALID_STATUS = 106;
const ERR_INVALID_TIMESTAMP = 107;
const ERR_AUTHORITY_NOT_VERIFIED = 108;
const ERR_INVALID_MIN_CONTRIB = 109;
const ERR_INVALID_MAX_FUND = 110;
const ERR_POOL_UPDATE_NOT_ALLOWED = 111;
const ERR_INVALID_UPDATE_PARAM = 112;
const ERR_MAX_POOLS_EXCEEDED = 113;
const ERR_INVALID_POOL_TYPE = 114;
const ERR_INVALID_INTEREST_RATE = 115;
const ERR_INVALID_DEADLINE = 116;
const ERR_INVALID_LOCATION = 117;
const ERR_INVALID_CURRENCY = 118;
const ERR_TRANSFER_FAILED = 119;
const ERR_INVALID_LENDER = 120;
const ERR_POOL_CLOSED = 121;
const ERR_INVALID_WITHDRAW_AMOUNT = 122;
const ERR_INVALID_REPAYMENT_RATE = 123;
const ERR_INVALID_GOV_THRESHOLD = 124;

interface Pool {
  proposalId: number;
  totalFunds: number;
  minContrib: number;
  maxFund: number;
  deadline: number;
  interestRate: number;
  status: boolean;
  creator: string;
  poolType: string;
  location: string;
  currency: string;
  timestamp: number;
  repaymentRate: number;
  govThreshold: number;
}

interface PoolUpdate {
  updateMinContrib: number;
  updateMaxFund: number;
  updateDeadline: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class LendingPoolMock {
  state: {
    nextPoolId: number;
    maxPools: number;
    creationFee: number;
    authorityContract: string | null;
    pools: Map<number, Pool>;
    poolUpdates: Map<number, PoolUpdate>;
    poolsByProposal: Map<number, number>;
    lenderContributions: Map<string, number>;
  } = {
    nextPoolId: 0,
    maxPools: 500,
    creationFee: 500,
    authorityContract: null,
    pools: new Map(),
    poolUpdates: new Map(),
    poolsByProposal: new Map(),
    lenderContributions: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxBalance: Map<string, number> = new Map([["ST1TEST", 10000]]);
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextPoolId: 0,
      maxPools: 500,
      creationFee: 500,
      authorityContract: null,
      pools: new Map(),
      poolUpdates: new Map(),
      poolsByProposal: new Map(),
      lenderContributions: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxBalance = new Map([["ST1TEST", 10000]]);
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (this.state.authorityContract === null) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    if (newFee < 0) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  createPool(
    proposalId: number,
    minContrib: number,
    maxFund: number,
    deadline: number,
    interestRate: number,
    poolType: string,
    location: string,
    currency: string,
    repaymentRate: number,
    govThreshold: number
  ): Result<number> {
    if (this.state.nextPoolId >= this.state.maxPools) return { ok: false, value: ERR_MAX_POOLS_EXCEEDED };
    if (proposalId <= 0) return { ok: false, value: ERR_INVALID_PROPOSAL_ID };
    if (minContrib <= 0) return { ok: false, value: ERR_INVALID_MIN_CONTRIB };
    if (maxFund <= 0) return { ok: false, value: ERR_INVALID_MAX_FUND };
    if (deadline <= this.blockHeight) return { ok: false, value: ERR_INVALID_DEADLINE };
    if (interestRate > 15) return { ok: false, value: ERR_INVALID_INTEREST_RATE };
    if (!["infrastructure", "community", "water"].includes(poolType)) return { ok: false, value: ERR_INVALID_POOL_TYPE };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "SIP10"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (repaymentRate > 100) return { ok: false, value: ERR_INVALID_REPAYMENT_RATE };
    if (govThreshold <= 0 || govThreshold > 100) return { ok: false, value: ERR_INVALID_GOV_THRESHOLD };
    if (this.state.poolsByProposal.has(proposalId)) return { ok: false, value: ERR_POOL_ALREADY_EXISTS };
    if (this.state.authorityContract === null) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    const balance = this.stxBalance.get(this.caller) || 0;
    if (balance < this.state.creationFee) return { ok: false, value: ERR_INSUFFICIENT_FUNDS };
    this.stxBalance.set(this.caller, balance - this.state.creationFee);
    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });
    const id = this.state.nextPoolId;
    const pool: Pool = {
      proposalId,
      totalFunds: 0,
      minContrib,
      maxFund,
      deadline,
      interestRate,
      status: true,
      creator: this.caller,
      poolType,
      location,
      currency,
      timestamp: this.blockHeight,
      repaymentRate,
      govThreshold,
    };
    this.state.pools.set(id, pool);
    this.state.poolsByProposal.set(proposalId, id);
    this.state.nextPoolId++;
    return { ok: true, value: id };
  }

  getPool(id: number): Pool | undefined {
    return this.state.pools.get(id);
  }

  lendToPool(poolId: number, amount: number): Result<boolean> {
    const pool = this.state.pools.get(poolId);
    if (!pool) return { ok: false, value: ERR_POOL_NOT_FOUND };
    if (!pool.status) return { ok: false, value: ERR_POOL_CLOSED };
    if (amount < pool.minContrib) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (pool.totalFunds + amount > pool.maxFund) return { ok: false, value: ERR_INVALID_MAX_FUND };
    if (this.blockHeight > pool.deadline) return { ok: false, value: ERR_INVALID_DEADLINE };
    const balance = this.stxBalance.get(this.caller) || 0;
    if (balance < amount) return { ok: false, value: ERR_INSUFFICIENT_FUNDS };
    this.stxBalance.set(this.caller, balance - amount);
    const contractBalance = this.stxBalance.get("contract") || 0;
    this.stxBalance.set("contract", contractBalance + amount);
    this.stxTransfers.push({ amount, from: this.caller, to: "contract" });
    const key = `${poolId}-${this.caller}`;
    const currentContrib = this.state.lenderContributions.get(key) || 0;
    this.state.lenderContributions.set(key, currentContrib + amount);
    const updatedPool = { ...pool, totalFunds: pool.totalFunds + amount };
    this.state.pools.set(poolId, updatedPool);
    return { ok: true, value: true };
  }

  withdrawFromPool(poolId: number, amount: number): Result<boolean> {
    const pool = this.state.pools.get(poolId);
    if (!pool) return { ok: false, value: ERR_POOL_NOT_FOUND };
    if (!pool.status) return { ok: false, value: ERR_POOL_CLOSED };
    if (this.blockHeight > pool.deadline) return { ok: false, value: ERR_INVALID_DEADLINE };
    const key = `${poolId}-${this.caller}`;
    const contrib = this.state.lenderContributions.get(key) || 0;
    if (contrib < amount) return { ok: false, value: ERR_INVALID_WITHDRAW_AMOUNT };
    const contractBalance = this.stxBalance.get("contract") || 0;
    if (contractBalance < amount) return { ok: false, value: ERR_INSUFFICIENT_FUNDS };
    this.stxBalance.set("contract", contractBalance - amount);
    const balance = this.stxBalance.get(this.caller) || 0;
    this.stxBalance.set(this.caller, balance + amount);
    this.stxTransfers.push({ amount, from: "contract", to: this.caller });
    this.state.lenderContributions.set(key, contrib - amount);
    const updatedPool = { ...pool, totalFunds: pool.totalFunds - amount };
    this.state.pools.set(poolId, updatedPool);
    return { ok: true, value: true };
  }

  updatePool(poolId: number, updateMinContrib: number, updateMaxFund: number, updateDeadline: number): Result<boolean> {
    const pool = this.state.pools.get(poolId);
    if (!pool) return { ok: false, value: ERR_POOL_NOT_FOUND };
    if (pool.creator !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (updateMinContrib <= 0) return { ok: false, value: ERR_INVALID_MIN_CONTRIB };
    if (updateMaxFund <= 0) return { ok: false, value: ERR_INVALID_MAX_FUND };
    if (updateDeadline <= this.blockHeight) return { ok: false, value: ERR_INVALID_DEADLINE };
    if (!pool.status) return { ok: false, value: ERR_POOL_UPDATE_NOT_ALLOWED };
    const updated: Pool = {
      ...pool,
      minContrib: updateMinContrib,
      maxFund: updateMaxFund,
      deadline: updateDeadline,
      timestamp: this.blockHeight,
    };
    this.state.pools.set(poolId, updated);
    this.state.poolUpdates.set(poolId, {
      updateMinContrib,
      updateMaxFund,
      updateDeadline,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  closePool(poolId: number): Result<boolean> {
    const pool = this.state.pools.get(poolId);
    if (!pool) return { ok: false, value: ERR_POOL_NOT_FOUND };
    if (pool.creator !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!pool.status) return { ok: false, value: ERR_INVALID_STATUS };
    const updated: Pool = { ...pool, status: false };
    this.state.pools.set(poolId, updated);
    return { ok: true, value: true };
  }

  getPoolCount(): Result<number> {
    return { ok: true, value: this.state.nextPoolId };
  }

  checkPoolExistence(proposalId: number): Result<boolean> {
    return { ok: true, value: this.state.poolsByProposal.has(proposalId) };
  }

  getLenderContribution(poolId: number, lender: string): number {
    const key = `${poolId}-${lender}`;
    return this.state.lenderContributions.get(key) || 0;
  }
}

describe("LendingPoolContract", () => {
  let contract: LendingPoolMock;

  beforeEach(() => {
    contract = new LendingPoolMock();
    contract.reset();
  });

  it("creates a pool successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const pool = contract.getPool(0);
    expect(pool?.proposalId).toBe(1);
    expect(pool?.minContrib).toBe(50);
    expect(pool?.maxFund).toBe(1000);
    expect(pool?.deadline).toBe(100);
    expect(pool?.interestRate).toBe(5);
    expect(pool?.poolType).toBe("infrastructure");
    expect(pool?.location).toBe("VillageX");
    expect(pool?.currency).toBe("STX");
    expect(pool?.repaymentRate).toBe(10);
    expect(pool?.govThreshold).toBe(50);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate pool for proposal", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    const result = contract.createPool(
      1,
      100,
      2000,
      200,
      10,
      "community",
      "CityY",
      "SIP10",
      20,
      60
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_POOL_ALREADY_EXISTS);
  });

  it("rejects pool creation without authority", () => {
    const result = contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid min contrib", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPool(
      1,
      0,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MIN_CONTRIB);
  });

  it("lends to pool successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    const result = contract.lendToPool(0, 100);
    expect(result.ok).toBe(true);
    const pool = contract.getPool(0);
    expect(pool?.totalFunds).toBe(100);
    expect(contract.getLenderContribution(0, "ST1TEST")).toBe(100);
    expect(contract.stxTransfers[1]).toEqual({ amount: 100, from: "ST1TEST", to: "contract" });
  });

  it("rejects lend below min contrib", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    const result = contract.lendToPool(0, 40);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("withdraws from pool successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    contract.lendToPool(0, 100);
    const result = contract.withdrawFromPool(0, 50);
    expect(result.ok).toBe(true);
    const pool = contract.getPool(0);
    expect(pool?.totalFunds).toBe(50);
    expect(contract.getLenderContribution(0, "ST1TEST")).toBe(50);
    expect(contract.stxTransfers[2]).toEqual({ amount: 50, from: "contract", to: "ST1TEST" });
  });

  it("rejects withdraw more than contributed", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    contract.lendToPool(0, 100);
    const result = contract.withdrawFromPool(0, 150);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_WITHDRAW_AMOUNT);
  });

  it("updates pool successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    const result = contract.updatePool(0, 60, 1500, 150);
    expect(result.ok).toBe(true);
    const pool = contract.getPool(0);
    expect(pool?.minContrib).toBe(60);
    expect(pool?.maxFund).toBe(1500);
    expect(pool?.deadline).toBe(150);
    const update = contract.state.poolUpdates.get(0);
    expect(update?.updateMinContrib).toBe(60);
    expect(update?.updateMaxFund).toBe(1500);
    expect(update?.updateDeadline).toBe(150);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    contract.caller = "ST3FAKE";
    const result = contract.updatePool(0, 60, 1500, 150);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("closes pool successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    const result = contract.closePool(0);
    expect(result.ok).toBe(true);
    const pool = contract.getPool(0);
    expect(pool?.status).toBe(false);
  });

  it("rejects close by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    contract.caller = "ST3FAKE";
    const result = contract.closePool(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("returns correct pool count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    contract.createPool(
      2,
      100,
      2000,
      200,
      10,
      "community",
      "CityY",
      "SIP10",
      20,
      60
    );
    const result = contract.getPoolCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks pool existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    const result = contract.checkPoolExistence(1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkPoolExistence(99);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("parses pool parameters with Clarity types", () => {
    const location = stringUtf8CV("VillageX");
    const minContrib = uintCV(50);
    const maxFund = uintCV(1000);
    expect(location.value).toBe("VillageX");
    expect(minContrib.value).toEqual(BigInt(50));
    expect(maxFund.value).toEqual(BigInt(1000));
  });

  it("rejects pool creation with insufficient balance", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.stxBalance.set("ST1TEST", 400);
    const result = contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_FUNDS);
  });

  it("rejects lend with insufficient balance", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    contract.stxBalance.set("ST1TEST", 40);
    const result = contract.lendToPool(0, 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_FUNDS);
  });

  it("rejects lend after deadline", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    contract.blockHeight = 101;
    const result = contract.lendToPool(0, 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DEADLINE);
  });

  it("rejects withdraw after deadline", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    contract.lendToPool(0, 100);
    contract.blockHeight = 101;
    const result = contract.withdrawFromPool(0, 50);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DEADLINE);
  });

  it("rejects lend to closed pool", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    contract.closePool(0);
    const result = contract.lendToPool(0, 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_POOL_CLOSED);
  });

  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(1000);
    expect(result.ok).toBe(true);
    expect(contract.state.creationFee).toBe(1000);
    contract.createPool(
      1,
      50,
      1000,
      100,
      5,
      "infrastructure",
      "VillageX",
      "STX",
      10,
      50
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });
});