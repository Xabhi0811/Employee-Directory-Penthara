import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import {
  EMPLOYMENT_TYPES,
  VALIDATION_RULES,
} from '../../shared/constants/validation.constants.js';

/**
 * @fileoverview Employee Model - Mongoose schema for employee data
 * @module models/Employee
 * @requires mongoose
 * @requires utils/logger
 */

/**
 * Employee Schema Definition
 * 
 * Defines the structure, validation rules, indexes, and methods for employee documents.
 * Optimized for performance with appropriate indexes and lean queries.
 * 
 * @typedef {Object} EmployeeSchema
 * @property {string} name - Employee full name (2-100 characters)
 * @property {string} role - Job role/title (2-100 characters)
 * @property {string} department - Department name (2-100 characters)
 * @property {string} email - Unique email address (lowercase, validated format)
 * @property {string} phone - Phone number (10-20 characters)
 * @property {Date} joiningDate - Date of joining (cannot be future)
 * @property {boolean} isActive - Active status (default: true)
 * @property {boolean} isArchived - Archive status (default: false)
 * @property {Date} createdAt - Auto-generated creation timestamp
 * @property {Date} updatedAt - Auto-generated update timestamp
 */
const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
      // Index for sorting and searching
      index: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
      minlength: [2, 'Role must be at least 2 characters long'],
      maxlength: [100, 'Role cannot exceed 100 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      minlength: [2, 'Department must be at least 2 characters long'],
      maxlength: [100, 'Department cannot exceed 100 characters'],
      // Index for filtering and grouping
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      // More strict email validation
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
      // Index for uniqueness and lookups
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      // More specific phone validation
      match: [
        /^\+?[\d\s\-\(\)]{10,20}$/,
        'Please provide a valid phone number (10-20 characters)',
      ],
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
      // Index for sorting by joining date
      index: true,
      validate: {
        validator: function (value) {
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          return value <= today;
        },
        message: 'Joining date cannot be in the future',
      },
    },
    employmentType: {
      type: String,
      required: [true, 'Employment type is required'],
      enum: {
        values: EMPLOYMENT_TYPES,
        message: 'Employment type must be either Fresher or Experienced',
      },
      trim: true,
      index: true,
    },
    // Previous-experience fields. Only meaningful when employmentType is
    // 'Experienced'; left undefined for freshers rather than stored as empty
    // strings. `required` is a function so it applies only to experienced hires.
    yearsOfExperience: {
      type: Number,
      required: [
        function () {
          return this.employmentType === 'Experienced';
        },
        VALIDATION_RULES.YEARS_OF_EXPERIENCE.REQUIRED_MESSAGE,
      ],
      min: [
        VALIDATION_RULES.YEARS_OF_EXPERIENCE.MIN,
        VALIDATION_RULES.YEARS_OF_EXPERIENCE.NEGATIVE_MESSAGE,
      ],
      max: [
        VALIDATION_RULES.YEARS_OF_EXPERIENCE.MAX,
        VALIDATION_RULES.YEARS_OF_EXPERIENCE.MAX_MESSAGE,
      ],
    },
    previousOrganization: {
      type: String,
      required: [
        function () {
          return this.employmentType === 'Experienced';
        },
        VALIDATION_RULES.PREVIOUS_ORGANIZATION.REQUIRED_MESSAGE,
      ],
      trim: true,
      maxlength: [
        VALIDATION_RULES.PREVIOUS_ORGANIZATION.MAX_LENGTH,
        'Previous organization cannot exceed 100 characters',
      ],
    },
    previousRole: {
      type: String,
      required: [
        function () {
          return this.employmentType === 'Experienced';
        },
        VALIDATION_RULES.PREVIOUS_ROLE.REQUIRED_MESSAGE,
      ],
      trim: true,
      maxlength: [
        VALIDATION_RULES.PREVIOUS_ROLE.MAX_LENGTH,
        'Last role cannot exceed 100 characters',
      ],
    },
    previousExperienceDescription: {
      type: String,
      required: [
        function () {
          return this.employmentType === 'Experienced';
        },
        VALIDATION_RULES.PREVIOUS_EXPERIENCE_DESCRIPTION.REQUIRED_MESSAGE,
      ],
      trim: true,
      maxlength: [
        VALIDATION_RULES.PREVIOUS_EXPERIENCE_DESCRIPTION.MAX_LENGTH,
        'Previous experience description cannot exceed 1000 characters',
      ],
    },
    // Soft delete support
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Archive support
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    // Enable timestamps
    timestamps: true,
    // Optimize collection name
    collection: 'employees',
    // toJSON transformation
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.isActive;
        delete ret.isArchived;
        return ret;
      },
    },
    // toObject transformation
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    // Enable strict mode
    strict: true,
    // Optimize validation
    validateBeforeSave: true,
  }
);

/**
 * INDEXES FOR QUERY OPTIMIZATION
 */

// Compound index for search (text search on name and department)
employeeSchema.index(
  { name: 'text', department: 'text', role: 'text' },
  {
    name: 'employee_text_search',
    weights: {
      name: 10,      // Name is most important
      department: 5, // Department second
      role: 3,       // Role third
    },
  }
);

// Compound index for common queries (active employees by department)
employeeSchema.index(
  { isActive: 1, department: 1, createdAt: -1 },
  { name: 'active_department_created' }
);

// Compound index for pagination with sorting
employeeSchema.index(
  { createdAt: -1, _id: -1 },
  { name: 'pagination_default' }
);

// Index for joining date queries
employeeSchema.index(
  { joiningDate: -1 },
  { name: 'joining_date_sort' }
);

// Sparse index for email lookups (only index non-null emails)
employeeSchema.index(
  { email: 1 },
  { unique: true, sparse: true, name: 'email_unique' }
);

/**
 * VIRTUAL FIELDS
 * 
 * Virtual properties are not stored in MongoDB but calculated on-the-fly
 */

/**
 * Virtual property for formatted employee information
 * 
 * @name fullInfo
 * @memberof EmployeeSchema
 * @returns {string} Formatted string with name, role, and department
 * @example
 * // Returns: "John Doe - Software Engineer (Engineering)"
 * employee.fullInfo
 */
employeeSchema.virtual('fullInfo').get(function () {
  return `${this.name} - ${this.role} (${this.department})`;
});

/**
 * Virtual property for years of service calculation
 * 
 * @name yearsOfService
 * @memberof EmployeeSchema
 * @returns {number} Number of years since joining (floor value)
 * @example
 * // Returns: 3 (if joined 3.5 years ago)
 * employee.yearsOfService
 */
employeeSchema.virtual('yearsOfService').get(function () {
  const now = new Date();
  const joining = new Date(this.joiningDate);
  return Math.floor((now - joining) / (365.25 * 24 * 60 * 60 * 1000));
});

/**
 * INSTANCE METHODS
 * 
 * Methods available on individual employee documents
 */

/**
 * Soft delete an employee (marks as inactive without removing from database)
 * 
 * @memberof EmployeeSchema
 * @instance
 * @returns {Promise<Employee>} The updated employee document
 * @throws {Error} If save operation fails
 * @example
 * const employee = await Employee.findById(id);
 * await employee.softDelete();
 */
employeeSchema.methods.softDelete = function () {
  this.isActive = false;
  return this.save();
};

/**
 * Archive an employee (marks as archived)
 * 
 * @memberof EmployeeSchema
 * @instance
 * @returns {Promise<Employee>} The updated employee document
 * @throws {Error} If save operation fails
 * @example
 * const employee = await Employee.findById(id);
 * await employee.archive();
 */
employeeSchema.methods.archive = function () {
  this.isArchived = true;
  return this.save();
};

/**
 * Restore a soft-deleted or archived employee
 * 
 * @memberof EmployeeSchema
 * @instance
 * @returns {Promise<Employee>} The updated employee document
 * @throws {Error} If save operation fails
 * @example
 * const employee = await Employee.findById(id);
 * await employee.restore();
 */
employeeSchema.methods.restore = function () {
  this.isActive = true;
  this.isArchived = false;
  return this.save();
};

/**
 * STATIC METHODS FOR OPTIMIZED QUERIES
 * 
 * Methods available on the Employee model (not instances)
 */

/**
 * Find all active (non-archived, non-deleted) employees
 * Returns lean documents for better performance
 * 
 * @static
 * @param {Object} [query={}] - MongoDB query conditions
 * @param {Object} [options={}] - Query options (sort, limit, skip, etc.)
 * @returns {Promise<Array<Object>>} Array of plain employee objects
 * @example
 * const engineers = await Employee.findActive({ department: 'Engineering' });
 */
employeeSchema.statics.findActive = function (query = {}, options = {}) {
  return this.find({ ...query, isActive: true, isArchived: false }, null, options).lean();
};

/**
 * Count active employees matching the query
 * 
 * @static
 * @param {Object} [query={}] - MongoDB query conditions
 * @returns {Promise<number>} Count of matching active employees
 * @example
 * const count = await Employee.countActive({ department: 'Engineering' });
 */
employeeSchema.statics.countActive = function (query = {}) {
  return this.countDocuments({ ...query, isActive: true, isArchived: false });
};

/**
 * Find employees with pagination support
 * Optimized with parallel execution of query and count
 * 
 * @static
 * @param {Object} [query={}] - MongoDB query conditions
 * @param {number} [page=1] - Page number (1-indexed)
 * @param {number} [limit=10] - Number of results per page
 * @param {Object} [sort={}] - Sort criteria
 * @returns {Promise<{results: Array<Object>, total: number}>} Paginated results and total count
 * @example
 * const { results, total } = await Employee.findPaginated(
 *   { department: 'Engineering' },
 *   1,
 *   20,
 *   { createdAt: -1 }
 * );
 */
employeeSchema.statics.findPaginated = async function (query = {}, page = 1, limit = 10, sort = {}) {
  const skip = (page - 1) * limit;
  
  const [results, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    this.countDocuments(query).exec(),
  ]);
  
  return { results, total };
};

/**
 * Bulk create employees with validation
 * Uses ordered:false for better error handling
 * 
 * @static
 * @param {Array<Object>} employees - Array of employee data objects
 * @returns {Promise<Object>} Result object with inserted documents and errors
 * @throws {Error} If insertMany fails
 * @example
 * const employees = [
 *   { name: 'John', role: 'Engineer', ... },
 *   { name: 'Jane', role: 'Manager', ... }
 * ];
 * const result = await Employee.bulkCreate(employees);
 */
employeeSchema.statics.bulkCreate = async function (employees) {
  return this.insertMany(employees, { ordered: false, rawResult: true });
};

/**
 * MIDDLEWARE (HOOKS)
 * 
 * Mongoose middleware for automatic data processing
 */

/**
 * Pre-save middleware for data normalization
 * Ensures consistent data format before saving to database
 * 
 * @param {Function} next - Next middleware function
 */
employeeSchema.pre('save', function (next) {
  // Ensure email is lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  // Trim all string fields
  if (this.name) this.name = this.name.trim();
  if (this.role) this.role = this.role.trim();
  if (this.department) this.department = this.department.trim();
  if (this.phone) this.phone = this.phone.trim();
  
  next();
});

/**
 * Post-save middleware for logging
 * Logs employee creation/update events
 * 
 * @param {Employee} doc - The saved employee document
 */
employeeSchema.post('save', function (doc) {
  logger.info('Employee saved to database', {
    id: doc._id,
    name: doc.name,
    email: doc.email,
  });
});

/**
 * Pre-remove middleware for logging
 * Logs employee deletion events (warning level)
 * 
 * @param {Function} next - Next middleware function
 */
employeeSchema.pre('remove', function (next) {
  logger.warn('Employee being removed', {
    id: this._id,
    name: this.name,
  });
  next();
});

/**
 * Query middleware removed - filtering now handled at repository layer for better control
 * This prevents duplicate filtering and follows Single Responsibility Principle
 * Repository layer explicitly adds isActive/isArchived filters
 */

/**
 * ERROR HANDLING
 * 
 * Post-save error handler for MongoDB errors
 */

/**
 * Handle duplicate key errors (11000)
 * Converts MongoDB duplicate key errors to user-friendly messages
 * 
 * @param {Error} error - The error object from MongoDB
 * @param {Employee} doc - The employee document
 * @param {Function} next - Next error handler function
 */
employeeSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    next(new Error(`${field} already exists`));
  } else {
    next(error);
  }
});

/**
 * CREATE MODEL
 * 
 * Create and export the Employee model from the schema
 * 
 * @type {mongoose.Model<Employee>}
 */
const Employee = mongoose.model('Employee', employeeSchema);

/**
 * CREATE INDEXES ON STARTUP
 * Ensure all defined indexes are created when application starts
 * This is important for query performance
 */
Employee.createIndexes()
  .then(() => {
    logger.info('Employee indexes created successfully');
  })
  .catch((error) => {
    logger.error('Error creating Employee indexes:', error);
  });

/**
 * @exports Employee
 * @description Mongoose model for employee documents with validation, indexes, and helper methods
 */
export default Employee;
