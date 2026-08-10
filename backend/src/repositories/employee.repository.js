/**
 * Employee Repository
 * Optimized database access layer with lean queries and proper indexing
 * Single Responsibility: Database operations only
 */

import Employee from '../models/Employee.js';
import logger from '../utils/logger.js';

class EmployeeRepository {
  /**
   * Find all employees with optional filters and pagination
   * Uses lean() for better performance
   * @param {Object} query - MongoDB query object
   * @param {Object} options - Query options (sort, limit, skip, select)
   * @returns {Promise<Array>}
   */
  async findAll(query = {}, options = {}) {
    try {
      const {
        sort = { createdAt: -1 },
        limit,
        skip,
        select = null,
        includeInactive = false,
      } = options;

      // Build query
      const searchQuery = includeInactive
        ? query
        : { ...query, isActive: true, isArchived: false };

      // Build query with options
      let queryBuilder = Employee.find(searchQuery)
        .sort(sort)
        .lean({ virtuals: false }); // Lean for performance, no virtuals needed

      // Apply an index hint only when a suitable index exists.
      // Mongoose throws "Invalid hint. null" if hint() is called with null, so
      // the no-hint case must skip the call entirely and let MongoDB choose.
      const indexHint = this._getOptimalIndex(searchQuery, sort);
      if (indexHint) {
        queryBuilder = queryBuilder.hint(indexHint);
      }

      // Apply select if provided
      if (select) {
        queryBuilder = queryBuilder.select(select);
      }

      // Apply pagination
      if (skip) queryBuilder = queryBuilder.skip(skip);
      if (limit) queryBuilder = queryBuilder.limit(limit);

      const results = await queryBuilder.exec();
      
      logger.debug('Repository: findAll executed', {
        query: searchQuery,
        count: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Repository: findAll error', { error: error.message });
      throw error;
    }
  }

  /**
   * Find employee by ID (optimized with lean)
   * @param {string} id - Employee ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    try {
      const employee = await Employee.findById(id)
        .where({ isActive: true, isArchived: false })
        .lean()
        .exec();

      logger.debug('Repository: findById executed', { id, found: !!employee });
      return employee;
    } catch (error) {
      logger.error('Repository: findById error', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find one employee by query (optimized with lean)
   * @param {Object} query - MongoDB query object
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>}
   */
  async findOne(query, options = {}) {
    try {
      const { includeInactive = false, select = null } = options;

      const searchQuery = includeInactive
        ? query
        : { ...query, isActive: true, isArchived: false };

      let queryBuilder = Employee.findOne(searchQuery).lean();

      if (select) {
        queryBuilder = queryBuilder.select(select);
      }

      const employee = await queryBuilder.exec();

      logger.debug('Repository: findOne executed', { query: searchQuery, found: !!employee });
      return employee;
    } catch (error) {
      logger.error('Repository: findOne error', { query, error: error.message });
      throw error;
    }
  }

  /**
   * Create new employee (uses model method, not lean)
   * @param {Object} employeeData - Employee data
   * @returns {Promise<Object>}
   */
  async create(employeeData) {
    try {
      const employee = new Employee(employeeData);
      const saved = await employee.save();
      
      logger.info('Repository: Employee created', { id: saved._id });
      
      // Return as lean object
      return saved.toObject();
    } catch (error) {
      logger.error('Repository: create error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update employee by ID (optimized with lean)
   * @param {string} id - Employee ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>}
   */
  async updateById(id, updateData, unsetFields = []) {
    try {
      // `$unset` is used (rather than setting empty strings) so previous-experience
      // fields disappear entirely when an employee switches to 'Fresher'.
      const updateOperation = { $set: updateData };
      if (unsetFields.length > 0) {
        updateOperation.$unset = unsetFields.reduce((acc, field) => {
          acc[field] = '';
          return acc;
        }, {});
      }

      const employee = await Employee.findByIdAndUpdate(
        id,
        updateOperation,
        {
          new: true,              // Return updated document
          runValidators: true,    // Run schema validators
          lean: true,             // Return plain object for performance
          context: 'query',       // Set context for validators
        }
      )
        .where({ isActive: true, isArchived: false })
        .exec();

      logger.info('Repository: Employee updated', { id, found: !!employee });
      return employee;
    } catch (error) {
      logger.error('Repository: updateById error', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Soft delete employee by ID
   * @param {string} id - Employee ID
   * @returns {Promise<Object|null>}
   */
  async deleteById(id) {
    try {
      // Soft delete: Set isActive to false
      const employee = await Employee.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true, lean: true }
      )
        .where({ isActive: true })
        .exec();

      logger.info('Repository: Employee soft deleted', { id, found: !!employee });
      return employee;
    } catch (error) {
      logger.error('Repository: deleteById error', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Hard delete employee by ID (permanent deletion)
   * @param {string} id - Employee ID
   * @returns {Promise<Object|null>}
   */
  async hardDelete(id) {
    try {
      const employee = await Employee.findByIdAndDelete(id).lean().exec();
      
      logger.warn('Repository: Employee permanently deleted', { id, found: !!employee });
      return employee;
    } catch (error) {
      logger.error('Repository: hardDelete error', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Count documents matching query (optimized)
   * @param {Object} query - MongoDB query object
   * @returns {Promise<number>}
   */
  async count(query = {}) {
    try {
      const searchQuery = { ...query, isActive: true, isArchived: false };
      
      // Use countDocuments for accuracy
      const count = await Employee.countDocuments(searchQuery).exec();
      
      logger.debug('Repository: count executed', { query: searchQuery, count });
      return count;
    } catch (error) {
      logger.error('Repository: count error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get every department that currently has employees, with a live headcount.
   *
   * Counts are derived from the employee records themselves via aggregation, so
   * there is no duplicated department collection to keep in sync.
   *
   * @returns {Promise<Array<{name: string, employeeCount: number}>>}
   */
  async getDepartmentCounts() {
    try {
      const results = await Employee.aggregate([
        { $match: { isActive: true, isArchived: false } },
        { $group: { _id: '$department', employeeCount: { $sum: 1 } } },
        { $project: { _id: 0, name: '$_id', employeeCount: 1 } },
        { $sort: { name: 1 } },
      ]).exec();

      logger.debug('Repository: getDepartmentCounts executed', {
        departments: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Repository: getDepartmentCounts error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get distinct values for a field (optimized)
   * @param {string} field - Field name
   * @param {Object} query - Optional query filter
   * @returns {Promise<Array>}
   */
  async distinct(field, query = {}) {
    try {
      const searchQuery = { ...query, isActive: true, isArchived: false };
      
      const values = await Employee.distinct(field, searchQuery).exec();
      
      logger.debug('Repository: distinct executed', { field, count: values.length });
      return values;
    } catch (error) {
      logger.error('Repository: distinct error', { field, error: error.message });
      throw error;
    }
  }

  /**
   * Check if employee exists by query (optimized)
   * @param {Object} query - MongoDB query object
   * @returns {Promise<boolean>}
   */
  async exists(query) {
    try {
      const searchQuery = { ...query, isActive: true, isArchived: false };
      
      // Use findOne with _id only for better performance
      const exists = await Employee.exists(searchQuery).exec();
      
      logger.debug('Repository: exists executed', { query: searchQuery, exists: !!exists });
      return !!exists;
    } catch (error) {
      logger.error('Repository: exists error', { error: error.message });
      throw error;
    }
  }

  /**
   * Bulk create employees (optimized with insertMany)
   * @param {Array} employees - Array of employee objects
   * @returns {Promise<Array>}
   */
  async bulkCreate(employees) {
    try {
      const result = await Employee.insertMany(employees, {
        ordered: false,      // Continue on error
        lean: true,          // Return plain objects
        rawResult: true,     // Include MongoDB result info
      });

      logger.info('Repository: Bulk create executed', {
        inserted: result.insertedCount,
        total: employees.length,
      });

      return result;
    } catch (error) {
      logger.error('Repository: bulkCreate error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get aggregated statistics (optimized aggregation pipeline)
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    try {
      const stats = await Employee.aggregate([
        // Match only active employees
        { $match: { isActive: true, isArchived: false } },
        
        // Group by department
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
            avgYearsOfService: {
              $avg: {
                $divide: [
                  { $subtract: [new Date(), '$joiningDate'] },
                  365.25 * 24 * 60 * 60 * 1000,
                ],
              },
            },
          },
        },
        
        // Sort by count descending
        { $sort: { count: -1 } },
        
        // Project final shape
        {
          $project: {
            _id: 0,
            department: '$_id',
            employeeCount: '$count',
            avgYearsOfService: { $round: ['$avgYearsOfService', 1] },
          },
        },
      ]).exec();

      logger.debug('Repository: getStatistics executed', { departments: stats.length });
      return stats;
    } catch (error) {
      logger.error('Repository: getStatistics error', { error: error.message });
      throw error;
    }
  }

  /**
   * Text search (uses text index for performance)
   * @param {string} searchText - Text to search
   * @param {Object} options - Search options
   * @returns {Promise<Array>}
   */
  async textSearch(searchText, options = {}) {
    try {
      const { limit = 20, score = false } = options;

      let queryBuilder = Employee.find(
        {
          $text: { $search: searchText },
          isActive: true,
          isArchived: false,
        },
        score ? { score: { $meta: 'textScore' } } : null
      ).lean();

      if (score) {
        queryBuilder = queryBuilder.sort({ score: { $meta: 'textScore' } });
      }

      const results = await queryBuilder.limit(limit).exec();

      logger.debug('Repository: textSearch executed', {
        searchText,
        count: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Repository: textSearch error', {
        searchText,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get optimal index hint for query
   * @private
   * @param {Object} query - Query object
   * @param {Object} sort - Sort object
   * @returns {Object} - Index hint
   */
  _getOptimalIndex(query, sort) {
    // MongoDB rejects a query that combines $text with hint():
    // "text and hint not allowed in same query". A text search must be left to
    // the text index, so never return a hint for one.
    if (query && query.$text) {
      return null;
    }

    // If sorting by createdAt, use pagination index
    if (sort.createdAt) {
      return { createdAt: -1, _id: -1 };
    }

    // If filtering by department, use department index
    if (query.department) {
      return { department: 1 };
    }

    // If sorting by name, use name index
    if (sort.name) {
      return { name: 1 };
    }

    // If sorting by joiningDate, use joiningDate index
    if (sort.joiningDate) {
      return { joiningDate: -1 };
    }

    // Default: let MongoDB choose
    return null;
  }
}

export default new EmployeeRepository();
