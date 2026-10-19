import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../src/models/User.js';
import { Puja } from '../src/models/Puja.js';
import { Post } from '../src/models/Post.js';
import { connectDB } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SAMPLE_PUJAS = [
  {
    name: 'Bagbazar Sarbojanin Durgotsav',
    slug: 'bagbazar-sarbojanin-durgotsav',
    description:
      'Over a century old, Bagbazar Sarbojanin is renowned for its iconic traditional Ekchala Pratima, pure white Daaker Saaj, and timeless Bengali heritage ambiance on the banks of the Hooghly.',
    address: '7/1, Bagbazar Street, Near Girish Park Metro',
    locality: 'Bagbazar, North Kolkata',
    category: 'Traditional / Heritage',
    timings: 'Open 24 Hours during Puja days',
    festivalYear: 2026,
    // GeoJSON [longitude, latitude]
    location: {
      type: 'Point',
      coordinates: [88.3667, 22.6025],
    },
    images: [
      'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
  {
    name: 'College Square Sarbojanin',
    slug: 'college-square-sarbojanin',
    description:
      'Famous for its breathtaking water illumination reflecting across the historic College Square lake, grand architectural replica pandals, and lively student hub atmosphere.',
    address: '53/1, College Street, Calcutta University Campus Area',
    locality: 'College Street, Central Kolkata',
    category: 'Theme / Contemporary',
    timings: '5:00 PM - 4:00 AM',
    festivalYear: 2026,
    location: {
      type: 'Point',
      coordinates: [88.3639, 22.5744],
    },
    images: [
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
  {
    name: 'Sreebhumi Sporting Club',
    slug: 'sreebhumi-sporting-club',
    description:
      'Renowned across India for grand international architectural replicas, dazzling lighting displays by Chandannagar artisans, and stunning gold and diamond jewellery ornaments.',
    address: 'VIP Road, Sreebhumi, Lake Town',
    locality: 'Lake Town, VIP Road',
    category: 'Theme / Contemporary',
    timings: 'Open 24 Hours',
    festivalYear: 2026,
    location: {
      type: 'Point',
      coordinates: [88.4011, 22.5989],
    },
    images: [
      'https://images.unsplash.com/photo-1596405344246-b329d138676f?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
  {
    name: 'Ekdalia Evergreen Club',
    slug: 'ekdalia-evergreen-club',
    description:
      'A South Kolkata powerhouse preserving pure traditional Pratima and temple-architecture pandals with world-famous German chandeliers and Chandannagar light artistry since 1943.',
    address: '15, Ekdalia Road, Gariahat',
    locality: 'Gariahat, South Kolkata',
    category: 'Traditional / Heritage',
    timings: 'Open 24 Hours',
    festivalYear: 2026,
    location: {
      type: 'Point',
      coordinates: [88.3644, 22.5208],
    },
    images: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
  {
    name: 'Suruchi Sangha',
    slug: 'suruchi-sangha',
    description:
      'Celebrated each year for innovative socio-cultural state themes highlighting traditional Indian folk art, handcrafted eco-friendly materials, and original theme music.',
    address: '500, SN Roy Road, New Alipore',
    locality: 'New Alipore, South Kolkata',
    category: 'Theme / Contemporary',
    timings: 'Open 24 Hours',
    festivalYear: 2026,
    location: {
      type: 'Point',
      coordinates: [88.3283, 22.5186],
    },
    images: [
      'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
  {
    name: 'Sovabazar Rajbari Durgotsav',
    slug: 'sovabazar-rajbari-durgotsav',
    description:
      'Commenced in 1757 by Raja Nabakrishna Deb, this is Kolkata’s premier historic Bonedi Bari Puja celebrated inside the royal Natmandir courtyard with centuries of unbroken aristocratic traditions.',
    address: '36 & 33, Raja Nabakrishna Street, Sovabazar',
    locality: 'Sovabazar, North Kolkata',
    category: 'Bonedi Bari / Household',
    timings: '9:00 AM - 10:00 PM',
    festivalYear: 2026,
    location: {
      type: 'Point',
      coordinates: [88.3642, 22.5986],
    },
    images: [
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
  {
    name: 'Kalyani ITI More Durgotsav (Luminous Club)',
    slug: 'kalyani-iti-more-durgotsav',
    description:
      'Nadia district’s most sensational modern crowd-puller featuring jaw-dropping full-scale world monument reconstructions attracting hundreds of thousands of festive visitors.',
    address: 'ITI More Ground, Near Kalyani Main Station',
    locality: 'Kalyani, Nadia',
    category: 'Theme / Contemporary',
    timings: 'Open 24 Hours',
    festivalYear: 2026,
    location: {
      type: 'Point',
      coordinates: [88.4344, 22.975],
    },
    images: [
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
  {
    name: 'Naihati Central Baroari',
    slug: 'naihati-central-baroari',
    description:
      'Historic North 24 Parganas celebration known for exquisite clay sculpting by master artisans of Krishnanagar and Kumartuli, community Dhaki performances, and vibrant Sindur Khela.',
    address: 'Station Road, Near Naihati Junction',
    locality: 'Naihati, North 24 Parganas',
    category: 'Community / Baroari',
    timings: 'Open 24 Hours',
    festivalYear: 2026,
    location: {
      type: 'Point',
      coordinates: [88.4239, 22.8944],
    },
    images: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
  {
    name: 'Barrackpore Sukanta Sadan Sarbojanin',
    slug: 'barrackpore-sukanta-sadan-sarbojanin',
    description:
      'One of the oldest and most beloved community Pujas in Barrackpore Cantonment, celebrated for artistic eco-friendly clay decor and traditional cultural evenings.',
    address: 'Near Sukanta Sadan, Barrackpore',
    locality: 'Barrackpore, North 24 Parganas',
    category: 'Community / Baroari',
    timings: 'Open 24 Hours',
    festivalYear: 2026,
    location: {
      type: 'Point',
      coordinates: [88.3778, 22.7667],
    },
    images: [
      'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
  {
    name: 'Sodepur Amarabati Sarbojanin',
    slug: 'sodepur-amarabati-sarbojanin',
    description:
      'Popular North Kolkata suburban Puja known for intricate threadwork, brass artwork, and warm neighborhood hospitality with community bhog distribution.',
    address: 'Amarabati Ground, Near Sodepur Station Road',
    locality: 'Sodepur, North 24 Parganas',
    category: 'Community / Baroari',
    timings: 'Open 24 Hours',
    festivalYear: 2026,
    location: {
      type: 'Point',
      coordinates: [88.3889, 22.7],
    },
    images: [
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
  {
    name: 'Halisahar Ramprasad Ghat Durgotsav',
    slug: 'halisahar-ramprasad-ghat-durgotsav',
    description:
      'Serene riverside celebration at the historic pilgrimage ghat of Sadhak Ramprasad, blending devotion, classical devotional music, and sacred Hooghly river vistas.',
    address: 'Ramprasad Ghat Road, Halisahar',
    locality: 'Halisahar, North 24 Parganas',
    category: 'Traditional / Heritage',
    timings: '8:00 AM - Midnight',
    festivalYear: 2026,
    location: {
      type: 'Point',
      coordinates: [88.4289, 22.925],
    },
    images: [
      'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1000&q=80',
    ],
    status: 'approved',
  },
];

export async function seedDatabase() {
  console.log('[Seed] Starting database population...');
  const adminPassword = process.env.ADMIN_PASSWORD;
  const hopperPassword = process.env.HOPPER_PASSWORD;

  if (!adminPassword || !hopperPassword) {
    throw new Error('ADMIN_PASSWORD and HOPPER_PASSWORD must be set in the environment before seeding.');
  }

  try {
    await connectDB();

    // 1. Create or ensure Owner user exists
    let admin = await User.findOne({ email: 'admin@pandalgo.com' });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);
      admin = await User.create({
        name: 'PandalGo Administrator',
        email: 'admin@pandalgo.com',
        passwordHash,
        role: 'admin',
      });
      console.log('✅ Admin user created: admin@pandalgo.com');
    }

    // 2. Create sample hopper user
    let hopper = await User.findOne({ email: 'hopper@pujomap.local' });
    if (!hopper) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(hopperPassword, salt);
      hopper = await User.create({
        name: 'Sourav Ganguly',
        email: 'hopper@pujomap.local',
        passwordHash,
        role: 'visitor',
      });
      console.log('✅ Sample hopper user created: hopper@pujomap.local');
    }

    // 3. Insert approved pandals from VERIFIED_KOLKATA_PUJAS
    const { VERIFIED_KOLKATA_PUJAS } = await import('../src/services/pujaDiscoveryService.js');
    for (const item of VERIFIED_KOLKATA_PUJAS) {
      const slug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = await Puja.findOne({
        $or: [
          { slug },
          { name: new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        ]
      });
      if (!existing) {
        await Puja.create({
          name: item.name,
          slug,
          locality: item.locality,
          address: item.address,
          description: item.description,
          category: item.category || 'Theme / Contemporary',
          timings: 'Open 24 Hours',
          festivalYear: 2026,
          location: {
            type: 'Point',
            coordinates: item.coordinates,
          },
          images: item.images && item.images.length > 0 ? item.images : [
            'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=1200&q=80'
          ],
          status: 'approved',
          createdBy: admin._id,
          reviewedBy: admin._id,
          reviewedAt: new Date(),
        });
        console.log(`  + Seeded approved pandal: ${item.name}`);
      }
    }

    // 4. Create sample community posts
    const bagbazar = await Puja.findOne({ slug: 'bagbazar-sarbojanin-durgotsav' });
    const sreebhumi = await Puja.findOne({ slug: 'sreebhumi-sporting-club' });

    const existingPostsCount = await Post.countDocuments();
    if (existingPostsCount === 0 && bagbazar && sreebhumi) {
      await Post.create([
        {
          authorId: hopper._id,
          title: 'Divine Ekchala Pratima at Bagbazar!',
          description:
            'Visited Bagbazar Sarbojanin this afternoon. The traditional Daaker Saaj idol looks utterly magnificent in the gentle autumn light. The queue moved swiftly and the Dhakis were creating an electrifying rhythm!',
          locality: 'Bagbazar, North Kolkata',
          images: [
            'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=1000&q=80',
          ],
          associatedPujaId: bagbazar._id,
          category: 'Pandal Photography',
          moderationStatus: 'published',
          location: bagbazar.location,
          locationSource: 'manual',
        },
        {
          authorId: admin._id,
          title: 'Spectacular Illuminations at Sreebhumi',
          description:
            'The replica palace design this year is out of this world. Chandannagar illumination artists have outdone themselves with the moving light arches on VIP Road.',
          locality: 'Lake Town, VIP Road',
          images: [
            'https://images.unsplash.com/photo-1596405344246-b329d138676f?auto=format&fit=crop&w=1000&q=80',
          ],
          associatedPujaId: sreebhumi._id,
          category: 'Puja Experience',
          moderationStatus: 'published',
          location: sreebhumi.location,
          locationSource: 'manual',
        },
      ]);
      console.log('✅ Seeded initial community posts');
    }

    console.log('\n🎉 Database seeding finished successfully!\n');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

// Run directly if invoked from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase().then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}
