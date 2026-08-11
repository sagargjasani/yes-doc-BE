import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel, { Role } from './src/models/User.model';
import { hashPassword } from './src/utils/password';
import { env } from './src/config/env';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('MongoDB Connected...');

    const adminExists = await UserModel.findOne({ role: Role.ADMIN });
    if (!adminExists) {
      const hashedPassword = await hashPassword('SGJ@2356'); // Default password

      await UserModel.create({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'sagar@yopmail.com',
        mobile: '0000000000',
        password: hashedPassword,
        role: Role.ADMIN,
      });
      console.log('Admin seeded successfully! Email: sagar@yopmail.com | Password: SGJ@2356');
    } else {
      console.log('Admin user already exists.');
    }

    const consultantsCount = await UserModel.countDocuments({ role: Role.CONSULTANT });
    if (consultantsCount === 0) {
      const hashedPassword = await hashPassword('consultant123');
      await UserModel.insertMany([
        {
          firstName: 'Alice',
          lastName: 'Consultant',
          email: 'alice@yopmail.com',
          mobile: '1234567890',
          password: hashedPassword,
          role: Role.CONSULTANT,
        },
        {
          firstName: 'Bob',
          lastName: 'Consultant',
          email: 'bob@yopmail.com',
          mobile: '0987654321',
          password: hashedPassword,
          role: Role.CONSULTANT,
        }
      ]);
      console.log('Consultants seeded successfully!');
    } else {
      console.log('Consultants already exist.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
