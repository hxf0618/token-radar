// The farm plan: seven steps per protocol, each an action with a cost and a time.
//
// Every step is derived from the protocol's own record (category, chains, TVL, age): the same
// function scores every row, and no protocol name is ever special-cased. Step seven is the risk
// and exit step the starter lacked: points are not a promised airdrop, and a position can lose
// value while you wait. The dashboard regenerates these same steps in the page from the same
// inputs, so the plan board.json carries and the plan the page shows are one derivation.

import type { SnapshotProtocol } from './model.ts';

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
export function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
export function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
export function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** Gas for the setup transaction, from the capital tier. */
export function setupGasUsd(p: SnapshotProtocol): number {
  return capitalFor(p) >= 150 ? 8 : 4;
}

/** Gas for one week of qualifying actions. */
export const WEEKLY_GAS_USD = 2;

/**
 * What the whole plan costs in cash terms: the capital at risk plus the gas to set it up and to
 * keep it qualifying for the hold. The capital is not spent, it stays in the position; the gas is.
 */
export function farmTotalCostUsd(p: SnapshotProtocol, age: number | null): number {
  const weeks = Math.ceil(holdDaysFor(age) / 7);
  return capitalFor(p) + setupGasUsd(p) + WEEKLY_GAS_USD * weeks;
}

/** The category's one action, in the words a farmer can follow. Order matters: the specific
 *  categories are checked before the generic ones ('bridge' before 'chain', 'allocator' before
 *  'chain', 'curator' before the default). */
export function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('basis')) return `Open a delta-neutral basis position through ${name} on ${chain} with $${capital}, so funding payments accrue while the hedge holds.`;
  if (c.includes('cedefi')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the receipt.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator')) return `Deposit $${capital} into a ${name} risk-curator vault on ${chain} and keep the vault shares; check the vault's fee and the curator's record first.`;
  if (c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('governance')) return `Lock or delegate $${capital} of voting power through ${name} on ${chain} and vote on one proposal.`;
  if (c.includes('payments')) return `Route $${capital} of payments through ${name} on ${chain} and keep the receipts.`;
  if (c.includes('chain')) return `Bridge $${capital} to ${name} and use its flagship app, keeping the position open.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list of
 * names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = setupGasUsd(p);
  const weeks = Math.ceil(hold / 7);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: `about $${WEEKLY_GAS_USD} of gas a week, about $${WEEKLY_GAS_USD * weeks} over the hold`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
    {
      text: `Know the risks before you farm: points are not a promised airdrop, a token may never launch, and a position can lose value while you wait. Never pay anyone to claim, and unwind in reverse order when you exit.`,
      cost: 'nothing but attention',
      time: '10 minutes',
    },
  ];
}
