import { readFile } from 'node:fs/promises';
import type { DB } from '../server/db.js';
import { id } from '../server/domain.js';
import { storePhoto, deletePhoto } from '../server/storage.js';

export const demoItems = [
  {
    title: 'Mid-century accent chair',
    category: 'Furniture',
    price: 14500,
    floor: 12000,
    condition: 'Good',
    photo: 'chair.jpg',
    description: 'Fictional demo listing: a mid-century accent chair, ready for another chapter.',
  },
  {
    title: 'Sony wireless headphones',
    category: 'Electronics',
    price: 8500,
    floor: 7000,
    condition: 'Good',
    photo: 'headphones.jpg',
    description:
      'Fictional demo listing: Sony wireless headphones. Ask the seller to confirm the model, battery life, and included accessories.',
  },
  {
    title: 'Canon EOS camera',
    category: 'Electronics',
    price: 32000,
    floor: 28000,
    condition: 'Like new',
    photo: 'camera.jpg',
    description:
      'Fictional demo listing: a Canon EOS camera. Ask the seller to confirm the model, shutter count, and included accessories.',
  },
  {
    title: 'New Balance sneakers',
    category: 'Clothing',
    price: 5500,
    floor: 4500,
    condition: 'Good',
    photo: 'shoes.jpg',
    description:
      'Fictional demo listing: New Balance sneakers. Ask the seller to confirm size and fit.',
  },
  {
    title: 'Brass adjustable desk lamp',
    category: 'Furniture',
    price: 6800,
    floor: 5500,
    condition: 'Good',
    photo: 'brass-lamp.png',
    description:
      'Fictional demo listing: an adjustable brass desk lamp with a warm finish and light signs of use.',
  },
  {
    title: 'Compact espresso machine',
    category: 'Electronics',
    price: 12500,
    floor: 10000,
    condition: 'Like new',
    photo: 'espresso-machine.png',
    description:
      'Fictional demo listing: a compact cream espresso machine for a small kitchen counter.',
  },
  {
    title: 'Three-shelf oak bookcase',
    category: 'Furniture',
    price: 9000,
    floor: 7000,
    condition: 'Good',
    photo: 'oak-bookcase.png',
    description:
      'Fictional demo listing: a compact three-shelf oak bookcase with a few small signs of use.',
  },
  {
    title: 'Pair of tennis rackets',
    category: 'Sports',
    price: 7500,
    floor: 6000,
    condition: 'Good',
    photo: 'tennis-rackets.png',
    description: 'Fictional demo listing: two modern tennis rackets with three practice balls.',
  },
];
const legacyTitles = [
  'Sony WH-1000XM4',
  'Oak dining chair',
  'The creative bookshelf',
  'Everyday denim jacket',
  'Weekend camera bag',
  'Adjustable desk lamp',
];

export async function seedDemoItems(db: DB, sellerId: string, replace = false) {
  const staged: { id: string; storage: string }[] = [];
  try {
    const owner = await db.get('SELECT email FROM users WHERE id=?', [sellerId]);
    if (owner?.email !== 'seller@encore.demo')
      throw Error('Only the demo seller inventory may be seeded');
    const knownTitles = new Set([...legacyTitles, ...demoItems.map((item) => item.title)]);
    const previous = (
      await db.all('SELECT id,title,reserved FROM listings WHERE seller_id=?', [sellerId])
    ).filter((row) => knownTitles.has(row.title));
    if (replace && previous.some((row) => row.reserved > 0))
      throw Error('Resolve demo reservations before replacing inventory');
    const existingTitles = new Set(previous.map((row) => row.title));
    const items = replace ? demoItems : demoItems.filter((item) => !existingTitles.has(item.title));
    for (const item of items) {
      const photoId = id();
      const bytes = await readFile(new URL(`../assets/demo/${item.photo}`, import.meta.url));
      staged.push({ id: photoId, storage: await storePhoto(photoId, bytes) });
    }
    await db.transaction(async (q) => {
      if (replace) {
        for (const row of previous) await q.run('DELETE FROM listings WHERE id=?', [row.id]);
      }
      const now = Date.now();
      for (const [index, item] of items.entries()) {
        const photo = staged[index];
        await q.run('INSERT INTO photos(id,user_id,storage,created_at) VALUES(?,?,?,?)', [
          photo.id,
          sellerId,
          photo.storage,
          now,
        ]);
        await q.run(
          `INSERT INTO listings(id,seller_id,title,category,condition,price,floor,quantity,description,area,latitude,longitude,pickup,status,photos,facts,created_at,updated_at)
           VALUES(?,?,?,?,?,?,?,1,?,'Scarborough · UTSC',43.78,-79.19,?,'published',?,'[]',?,?)`,
          [
            id(),
            sellerId,
            item.title,
            item.category,
            item.condition,
            item.price,
            item.floor,
            `${item.description} Reference concept photo; pictured accessories are not confirmed to be included.`,
            'Public library · weekday evenings, by arrangement',
            JSON.stringify([photo.id]),
            now - index,
            now,
          ],
        );
      }
    });
  } catch (error) {
    await Promise.all(staged.map((photo) => deletePhoto(photo.id, photo.storage)));
    throw error;
  }
}
