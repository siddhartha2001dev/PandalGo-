import { connectDB } from '../src/config/db.js';
import { Puja } from '../src/models/Puja.js';
import mongoose from 'mongoose';

async function check() {
  await connectDB();
  const all = await Puja.find({}).lean();
  console.log(`Total Pujas in DB: ${all.length}`);
  const statusCounts = {};
  all.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });
  console.log('Status counts:', statusCounts);
  
  const approved = all.filter(p => p.status === 'approved');
  console.log(`Approved count: ${approved.length}`);
  const nonApproved = all.filter(p => p.status !== 'approved');
  if (nonApproved.length > 0) {
    console.log('Non-approved pujas:', nonApproved.map(p => ({ name: p.name, status: p.status })));
  }

  // Check localities
  const localities = {};
  all.forEach(p => {
    localities[p.locality] = (localities[p.locality] || 0) + 1;
  });
  console.log('Localities distribution:', localities);

  await mongoose.disconnect();
}

check();
