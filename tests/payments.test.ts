import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { Keypair, Transaction, SystemInstruction } from '@solana/web3.js';
import { openDB, type DB } from '../server/db.js';
import { DEVNET_GENESIS, paymentIntent } from '../server/payments.js';

let server: Server,
  db: DB,
  genesis = DEVNET_GENESIS;
const payer = Keypair.generate().publicKey;
const recipient = Keypair.generate().publicKey;
before(async () => {
  server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const rpc = JSON.parse(body);
    const result =
      rpc.method === 'getGenesisHash'
        ? genesis
        : rpc.method === 'getLatestBlockhash'
          ? {
              context: { slot: 1 },
              value: {
                blockhash: Keypair.generate().publicKey.toBase58(),
                lastValidBlockHeight: 100,
              },
            }
          : null;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.SOLANA_DEVNET_RPC = `http://127.0.0.1:${(server.address() as any).port}`;
  db = await openDB({ file: ':memory:' });
  await db.run(
    "INSERT INTO users(id,name,email,password,created_at) VALUES('seller','Seller','s@example.test','unused',0),('buyer','Buyer','b@example.test','unused',0)",
  );
  await db.run(
    "INSERT INTO listings(id,seller_id,title,description,category,condition,price,floor,quantity,reserved,area,pickup,wallet,sol_lamports,created_at,updated_at) VALUES('item','seller','Lamp','Test lamp','Furniture','Good',3000,2200,2,2,'Campus','Library',?,100000,0,0)",
    [recipient.toBase58()],
  );
  await db.run(
    "INSERT INTO conversations(id,listing_id,buyer_id,created_at) VALUES('conversation','item','buyer',0)",
  );
  await db.run(
    "INSERT INTO requests(id,listing_id,conversation_id,buyer_id,kind,question,amount,quantity,status,created_at) VALUES('offer','item','conversation','buyer','offer','Buy two',3000,2,'approved',0)",
  );
});
after(async () => {
  delete process.env.SOLANA_DEVNET_RPC;
  await db.close();
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});
test('unsigned devnet intent uses approved stock, recipient, amount and unique reference', async () => {
  const intent = await paymentIntent(db, 'offer', 'buyer', payer.toBase58());
  const transaction = Transaction.from(Buffer.from(intent.transaction, 'base64'));
  const transfer = SystemInstruction.decodeTransfer(transaction.instructions[0]);
  assert.equal(intent.network, 'devnet');
  assert.equal(Number(transfer.lamports), 200000);
  assert.equal(transfer.toPubkey.toBase58(), recipient.toBase58());
  assert.equal(transfer.fromPubkey.toBase58(), payer.toBase58());
  assert.ok(transaction.signatures.every((s) => s.signature === null));
  const stored = (await db.get("SELECT * FROM requests WHERE id='offer'"))!;
  assert.ok(
    transaction.instructions[0].keys.some((k) => k.pubkey.toBase58() === stored.payment_reference),
  );
  assert.equal(stored.status, 'approved');
  assert.equal(stored.signature, null);
});
test('payment intent refuses the wrong buyer and any non-devnet RPC', async () => {
  await assert.rejects(
    paymentIntent(db, 'offer', 'someone-else', payer.toBase58()),
    /approved reservation/,
  );
  genesis = 'mainnet-genesis';
  try {
    await assert.rejects(
      paymentIntent(db, 'offer', 'buyer', payer.toBase58()),
      /must be Solana devnet/,
    );
  } finally {
    genesis = DEVNET_GENESIS;
  }
});
