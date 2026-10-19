import { Post } from '../models/Post.js';
import { Puja } from '../models/Puja.js';
import { clearPublicCache } from './publicCache.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function getCommunityPujaName(post) {
  return (post.title?.trim() || post.description?.trim().split(/[.!?\n]/)[0] || `${post.locality} Community Pandal`).slice(0, 150);
}

async function makeUniqueSlug(name) {
  const base = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-') || 'community-pandal';
  let slug = base;
  let counter = 1;
  while (await Puja.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

/**
 * Repairs older community posts created before posts and pandals shared one
 * canonical record. It is idempotent and skips posts without coordinates.
 */
export async function backfillCommunityPujas() {
  const cursor = Post.find({
    moderationStatus: 'published',
    associatedPujaId: null,
    'location.coordinates.0': { $exists: true },
    'location.coordinates.1': { $exists: true },
  }).cursor();

  let linked = 0;
  let skipped = 0;

  for await (const post of cursor) {
    try {
      const name = getCommunityPujaName(post);
      const locality = post.locality.trim();
      let puja = await Puja.findOne({
        name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
        locality: new RegExp(`^${escapeRegex(locality)}$`, 'i'),
      });

      if (!puja) {
        puja = await Puja.create({
          name,
          slug: await makeUniqueSlug(name),
          description: post.description?.slice(0, 2000) || '',
          address: locality,
          locality,
          category: 'Community / Baroari',
          festivalYear: new Date().getFullYear(),
          timings: 'Open 24 Hours during Puja days',
          location: post.location,
          images: post.images || [],
          status: 'approved',
          createdBy: post.authorId,
          reviewedBy: post.authorId,
          reviewedAt: new Date(),
        });
      } else if ((!puja.images || puja.images.length === 0) && post.images?.length) {
        puja.images = post.images;
        await puja.save();
      }

      await Post.updateOne({ _id: post._id, associatedPujaId: null }, { $set: { associatedPujaId: puja._id } });
      linked += 1;
    } catch (error) {
      skipped += 1;
      console.warn(`[Migration] Could not link community post ${post._id}: ${error.message}`);
    }
  }

  if (linked > 0) {
    clearPublicCache('pujas:');
    clearPublicCache('puja-suggestions:');
  }

  return { linked, skipped };
}
