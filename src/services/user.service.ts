import crypto from 'crypto';
import dayjs from 'dayjs';
import UserModel, { Role } from '../models/User.model';
import { AppError } from '../utils/AppError';
import { hashPassword } from '../utils/password';
import { sendCreatePasswordEmail } from '../utils/mailer';
import { CreateUserDto, GetUsersQueryDto, UpdateUserDto } from '../validation/user.dto';

export class UserService {
  async createUser(data: CreateUserDto) {
    // 1. Check if email exists
    const existingEmail = await UserModel.findOne({ email: data.email });
    if (existingEmail) {
      throw new AppError('A user with this email address already exists', 400);
    }

    // 2. Check if mobile exists
    const existingMobile = await UserModel.findOne({ mobile: data.mobile });
    if (existingMobile) {
      throw new AppError('A user with this mobile number already exists', 400);
    }

    // 3. Generate random temporary password and hash it
    const randomPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await hashPassword(randomPassword);

    // 4. Generate create/reset password token (valid for 24 hours)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 5. Create user
    const newUser = await UserModel.create({
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      email: data.email,
      mobile: data.mobile,
      role: data.role as unknown as Role,
      password: hashedPassword,
      isActive: true,
      resetPasswordToken: hash,
      resetPasswordExpires: dayjs().add(24, 'hour').toDate(),
    });

    // 6. Send invitation email to set password
    await sendCreatePasswordEmail(newUser.email, resetToken, newUser.role);

    const userResponse = newUser.toObject();
    delete (userResponse as any).password;
    delete (userResponse as any).resetPasswordToken;
    delete (userResponse as any).resetPasswordExpires;

    return userResponse;
  }

  async getUsers(query: GetUsersQueryDto) {
    // Filter staff members only (exclude candidates)
    const filter: any = {
      role: { $in: [Role.ADMIN, Role.CONSULTANT, Role.COMPLIANCE] },
    };

    // Role filter
    if (query.role && query.role !== 'ALL' && query.role !== 'all') {
      filter.role = query.role.toLowerCase();
    }

    // Status filter
    if (query.status && query.status !== 'ALL' && query.status !== 'all') {
      const statusLower = query.status.toLowerCase();
      if (statusLower === 'active') {
        filter.isActive = true;
      } else if (statusLower === 'deactivated' || statusLower === 'inactive') {
        filter.isActive = false;
      }
    }

    // Search query
    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex },
        { role: searchRegex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateUserStatus(id: string, isActive: boolean, currentUserId: string) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user._id.toString() === currentUserId && !isActive) {
      throw new AppError('You cannot deactivate your own account', 400);
    }

    user.isActive = isActive;
    await user.save();

    const userResponse = user.toObject();
    delete (userResponse as any).password;
    return userResponse;
  }

  async updateUser(id: string, data: UpdateUserDto) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (data.email && data.email !== user.email) {
      const existingEmail = await UserModel.findOne({ email: data.email, _id: { $ne: id } });
      if (existingEmail) {
        throw new AppError('A user with this email already exists', 400);
      }
      user.email = data.email;
    }

    if (data.mobile && data.mobile !== user.mobile) {
      const existingMobile = await UserModel.findOne({ mobile: data.mobile, _id: { $ne: id } });
      if (existingMobile) {
        throw new AppError('A user with this mobile number already exists', 400);
      }
      user.mobile = data.mobile;
    }

    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.middleName !== undefined) user.middleName = data.middleName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.role !== undefined) user.role = data.role as unknown as Role;

    await user.save();

    const userResponse = user.toObject();
    delete (userResponse as any).password;
    return userResponse;
  }

  async resendInvitation(id: string) {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = dayjs().add(24, 'hour').toDate();
    await user.save();

    await sendCreatePasswordEmail(user.email, resetToken, user.role);

    return { message: 'Invitation email resent successfully' };
  }
}

export const userService = new UserService();
