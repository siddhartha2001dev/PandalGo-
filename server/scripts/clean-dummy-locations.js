import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Puja } from '../src/models/Puja.js';
import { Post } from '../src/models/Post.js';
import { CrowdObservation } from '../src/models/CrowdObservation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function cleanDummyData() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pujomap';
  console.log('Connecting to MongoDB at:', uri);
  await mongoose.connect(uri);

  const pujaCountBefore = await Puja.countDocuments();
  const postCountBefore = await Post.countDocuments();
  const crowdCountBefore = await CrowdObservation.countDocuments();

  console.log(`Current stats: ${pujaCountBefore} Pujas, ${postCountBefore} Posts, ${crowdCountBefore} Crowd Observations`);

  // Remove dummy pujas, posts, crowd
  const deletePujas = await Puja.deleteMany({});
  const deletePosts = await Post.deleteMany({});
  const deleteCrowd = await CrowdObservation.deleteMany({});

  console.log(`Removed ${deletePujas.deletedCount} pujas, ${deletePosts.deletedCount} posts, ${deleteCrowd.deletedCount} crowd observations.`);
  console.log('Database successfully cleaned of dummy data! Ready for actual live service.');

  await mongoose.disconnect();
}

cleanDummyData().catch(err => {
  console.error('Error cleaning dummy data:', err);
  process.exit(1);
});
