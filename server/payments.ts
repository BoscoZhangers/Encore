import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  Keypair,
} from '@solana/web3.js';
import type { Query } from './db.js';
import { HttpError } from './domain.js';
export const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
function connection() {
  return new Connection(
    process.env.SOLANA_DEVNET_RPC || 'https://api.devnet.solana.com',
    'confirmed',
  );
}
async function checkedConnection() {
  const c = connection();
  if ((await c.getGenesisHash()) !== DEVNET_GENESIS)
    throw new HttpError(503, 'Payment connection must be Solana devnet');
  return c;
}
export async function paymentIntent(q: Query, requestId: string, buyerId: string, payer: string) {
  const r = await q.get(
    'SELECT r.*,l.wallet,l.sol_lamports FROM requests r JOIN listings l ON l.id=r.listing_id WHERE r.id=? AND r.buyer_id=?',
    [requestId, buyerId],
  );
  if (!r || r.status !== 'approved' || r.signature)
    throw new HttpError(409, 'An unpaid approved reservation is required');
  if (!r.wallet || !Number(r.sol_lamports))
    throw new HttpError(400, 'Seller has not enabled test-SOL payment');
  const c = await checkedConnection();
  const from = new PublicKey(payer),
    to = new PublicKey(r.wallet);
  if (!PublicKey.isOnCurve(from.toBytes()) || !PublicKey.isOnCurve(to.toBytes()))
    throw new HttpError(400, 'Use a standard wallet address');
  const reference = r.payment_reference || Keypair.generate().publicKey.toBase58();
  const lamports = Number(r.sol_lamports) * r.quantity;
  const { blockhash } = await c.getLatestBlockhash();
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: from }).add(
    SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }),
  );
  tx.instructions[0].keys.push({
    pubkey: new PublicKey(reference),
    isSigner: false,
    isWritable: false,
  });
  tx.add(
    new TransactionInstruction({
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      keys: [],
      data: Buffer.from(`Encore reservation ${r.id} — DEVNET TEST ONLY`),
    }),
  );
  await q.run(
    'UPDATE requests SET payment_reference=?,payment_wallet=?,payment_lamports=?,payment_created_at=? WHERE id=?',
    [reference, r.wallet, lamports, Date.now(), r.id],
  );
  return {
    transaction: tx.serialize({ requireAllSignatures: false }).toString('base64'),
    network: 'devnet',
    lamports,
    recipient: r.wallet,
  };
}
export async function verifyPayment(
  q: Query,
  requestId: string,
  buyerId: string,
  signature: string,
) {
  const r = await q.get('SELECT * FROM requests WHERE id=? AND buyer_id=?', [requestId, buyerId]);
  if (!r || r.status !== 'approved' || !r.payment_reference)
    throw new HttpError(409, 'An approved reservation with a payment intent is required');
  if (r.signature) {
    if (r.signature === signature) return { ok: true };
    throw new HttpError(409, 'Payment already recorded');
  }
  const c = await checkedConnection();
  const tx = await c.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });
  if (!tx || !tx.meta || tx.meta.err)
    throw new HttpError(400, 'Transaction is unconfirmed or failed');
  const hasReference = tx.transaction.message.accountKeys.some(
    (k) => k.pubkey.toBase58() === r.payment_reference,
  );
  const transfer = tx.transaction.message.instructions.some(
    (i: any) =>
      i.program === 'system' &&
      i.parsed?.type === 'transfer' &&
      i.parsed.info.destination === r.payment_wallet &&
      Number(i.parsed.info.lamports) === Number(r.payment_lamports),
  );
  if (!hasReference || !transfer)
    throw new HttpError(400, 'Transaction does not match this reservation');
  const updated = await q.run(
    "UPDATE requests SET signature=? WHERE id=? AND status='approved' AND signature IS NULL",
    [signature, r.id],
  );
  if (!updated) throw new HttpError(409, 'Reservation changed while verifying payment');
  return { ok: true, network: 'devnet' };
}
