import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.js';

/**
 * @fileoverview User Model - Mongoose schema for user authentication
 * @module models/User
 * @requires mongoose
 * @requires bcryptjs
 * @requires utils/logger
 */

/**
 * User Schema Definition
 * 
 * Defines the structure, validation rules, indexes, and methods for user documents.
 * Includes password hashing, secure comparison, and sanitization.
 * 
 * @typedef {Object} UserSchema
 * @property {string} name - User full name (2-100 characters)
 * @property {string} email - Unique email address (lowercase, validated format)
 * @property {string} passwordHash - Bcrypt hashed password (never exposed in responses)
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Never include in queries by default
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
    versionKey: false, // Disable __v field
  }
);

/**
 * Pre-save hook: Hash password before saving
 * Only runs when password is modified or new user is created
 */
userSchema.pre('save', async function (next) {
  // Only hash password if it has been modified or is new
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12); // 12 rounds for strong security
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    
    logger.debug('Password hashed successfully for user:', { email: this.email });
    next();
  } catch (error) {
    logger.error('Error hashing password:', error);
    next(error);
  }
});

/**
 * Instance method: Compare password with stored hash
 * Used for authentication during login
 * 
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} - True if password matches, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.passwordHash);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password:', error);
    return false;
  }
};

/**
 * Instance method: Get safe user object (without password)
 * Returns user data without sensitive fields
 * 
 * @returns {Object} - User object without passwordHash
 */
userSchema.methods.toSafeObject = function () {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  return userObject;
};

/**
 * JSON transformation: Remove passwordHash from JSON responses
 * Automatically applied when converting document to JSON
 */
userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

/**
 * Create indexes for performance
 * Email is unique and indexed for fast lookups
 */
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1 }); // For sorting by registration date

/**
 * Static method: Find user by email with password
 * Used for authentication (includes passwordHash)
 * 
 * @param {string} email - User email
 * @returns {Promise<User|null>} - User document with passwordHash or null
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+passwordHash');
};

/**
 * User Model
 * @type {mongoose.Model}
 */
const User = mongoose.model('User', userSchema);

export default User;
