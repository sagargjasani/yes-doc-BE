import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CommonAttributesModel, { CommonAttributeKey } from './src/models/CommonAttributes.model';
import { env } from './src/config/env';

dotenv.config();

const initialAttributes = [
  // Applied For
  { key: CommonAttributeKey.APPLIED_FOR, value: 'Carer' },
  { key: CommonAttributeKey.APPLIED_FOR, value: 'HCA' },
  { key: CommonAttributeKey.APPLIED_FOR, value: 'Support Worker' },

  // Location
  { key: CommonAttributeKey.LOCATION, value: 'London' },
  { key: CommonAttributeKey.LOCATION, value: 'Herts' },
  { key: CommonAttributeKey.LOCATION, value: 'Essex' },
  { key: CommonAttributeKey.LOCATION, value: 'Cambridge' },
];

const seedCommonAttributes = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('MongoDB Connected...');

    console.log('Seeding CommonAttributes...');
    for (const attr of initialAttributes) {
      await CommonAttributesModel.updateOne(
        { key: attr.key, value: attr.value },
        { $set: attr },
        { upsert: true }
      );
    }

    console.log('CommonAttributes seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding CommonAttributes:', error);
    process.exit(1);
  }
};

seedCommonAttributes();
