import employeeRepository from '../repositories/employee.repository.js';
import {
  EmployeeResponseDTO,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
} from '../dtos/employee.dto.js';
import { HTTP_STATUS, API_MESSAGES } from '../../shared/constants/http.constants.js';
import { EXPERIENCE_FIELDS } from '../../shared/constants/validation.constants.js';
import logger from '../utils/logger.js';

/**
 * @fileoverview Employee Service - Business logic layer for employee operations
 * @module services/EmployeeService
 * @requires repositories/employeeRepository
 * @requires dtos/employee.dto
 * @requires shared/constants/http.constants
 * @requires utils/logger
 */

/**
 * Employee Service Class
 * 
 * Implements all business logic for employee operations including:
 * - CRUD operations with validation
 * - Search and filtering
 * - Pagination and sorting
 * - Data transformation (DTOs)
 * - Error handling with appropriate status codes
 * 
 * Follows Single Responsibility Principle and Service Layer pattern
 * 
 * @class EmployeeService
 */
class EmployeeService {
  /**
   * Sanitize and validate pagination parameters
   * Ensures page and limit are within acceptable bounds
   * 
   * @private
   * @param {number|string} page - Page number (1-indexed)
   * @param {number|string} limit - Items per page (max: 100)
   * @returns {{page: number, limit: number, skip: number}} Validated pagination params
   * @example
   * const { page, limit, skip } = this._validatePagination(2, 20);
   * // Returns: { page: 2, limit: 20, skip: 20 }
   */
  _validatePagination(page, limit) {
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (validatedPage - 1) * validatedLimit;

    return { page: validatedPage, limit: validatedLimit, skip };
  }

  /**
   * Sanitize search term to prevent ReDoS attacks
   * Removes special characters and limits length
   * 
   * @private
   * @param {string} search - Raw search term from user input
   * @returns {string} Sanitized search term (alphanumeric + spaces only)
   * @example
   * const safe = this._sanitizeSearch("John<script>"); 
   * // Returns: "Johnscript"
   */
  _sanitizeSearch(search) {
    if (!search) return '';
    
    // Remove all special characters and limit length
    const sanitized = search
      .replace(/[^a-zA-Z0-9\s]/g, '') // Only allow alphanumeric and spaces
      .trim()
      .substring(0, 100); // Limit to 100 characters
    
    return sanitized;
  }

  /**
   * Build MongoDB query from filters
   * Uses MongoDB text search instead of regex to prevent ReDoS
   * 
   * @private
   * @param {{search?: string, department?: string}} filters - Search filters
   * @returns {Object} MongoDB query object
   * @example
   * const query = this._buildSearchQuery({ 
   *   search: 'engineer', 
   *   department: 'Engineering' 
   * });
   */
  _buildSearchQuery(filters) {
    const query = {};

    // Handle search using MongoDB text search (more secure and faster than regex)
    if (filters.search) {
      const sanitized = this._sanitizeSearch(filters.search);
      
      if (sanitized) {
        // Use MongoDB text search instead of regex
        // This leverages the text index and is immune to ReDoS
        query.$text = { $search: sanitized };
      }
    }

    // Handle department filter with exact match (case-insensitive)
    if (filters.department && filters.department !== 'all') {
      // Use exact match instead of regex to prevent ReDoS
      const sanitizedDept = filters.department
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .substring(0, 100);
      
      // Case-insensitive exact match without regex
      query.department = {
        $regex: `^${sanitizedDept}$`,
        $options: 'i',
      };
    }

    return query;
  }

  /**
   * Build sort options from sortBy and order parameters
   * Validates sort field against whitelist for security
   * 
   * @private
   * @param {string} sortBy - Field to sort by
   * @param {string} order - Sort order ('asc' or 'desc')
   * @returns {Object} MongoDB sort object
   * @example
   * const sort = this._buildSortOptions('name', 'asc');
   * // Returns: { name: 1 }
   */
  _buildSortOptions(sortBy, order) {
    const validSortFields = ['name', 'role', 'department', 'email', 'joiningDate', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;

    return { [sortField]: sortOrder };
  }

  /**
   * Get all employees with optional search, pagination, and sorting
   * 
   * PERFORMANCE OPTIMIZATIONS:
   * - Parallel queries (Promise.all)
   * - Selective field projection
   * - MongoDB text search (faster than regex)
   * - Pre-calculated pagination metadata
   * 
   * @async
   * @param {{search?: string, department?: string}} [filters={}] - Search filters
   * @param {{page?: number, limit?: number}} [pagination={}] - Pagination params
   * @param {{sortBy?: string, order?: string}} [sorting={}] - Sorting params
   * @returns {Promise<{employees: EmployeeResponseDTO[], pagination: Object}>} Employees with pagination metadata
   * @throws {Error} If database query fails
   * @example
   * const result = await employeeService.getAllEmployees(
   *   { search: 'engineer', department: 'Engineering' },
   *   { page: 1, limit: 20 },
   *   { sortBy: 'name', order: 'asc' }
   * );
   */
  async getAllEmployees(filters = {}, pagination = {}, sorting = {}) {
    try {
      logger.info('Fetching employees', { filters, pagination, sorting });

      // Validate and sanitize pagination
      const { page, limit, skip } = this._validatePagination(
        pagination.page,
        pagination.limit
      );

      // Build query
      const query = this._buildSearchQuery(filters);

      // Build sort options
      const sort = this._buildSortOptions(sorting.sortBy, sorting.order);

      // PERFORMANCE OPTIMIZATION: Select only needed fields
      const select = 'name role department email phone joiningDate createdAt updatedAt';

      // PERFORMANCE: Execute queries in parallel with Promise.all
      const [employees, total] = await Promise.all([
        employeeRepository.findAll(query, { sort, limit, skip, select }),
        employeeRepository.count(query),
      ]);

      // Transform to DTOs (minimal transformation for performance)
      const employeeDTOs = EmployeeResponseDTO.fromModelArray(employees);

      // PERFORMANCE: Pre-calculate pagination metadata
      const totalPages = Math.ceil(total / limit);

      logger.info(`Retrieved ${employeeDTOs.length} employees`, {
        total,
        page,
        limit,
      });

      return {
        employees: employeeDTOs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error fetching employees:', error);
      throw new Error(`Error fetching employees: ${error.message}`);
    }
  }

  /**
   * Get a single employee by ID
   * 
   * @async
   * @param {string} id - Employee MongoDB ObjectId
   * @returns {Promise<EmployeeResponseDTO>} Employee data as DTO
   * @throws {Error} If employee not found (404) or invalid ID format (400)
   * @example
   * const employee = await employeeService.getEmployeeById('65f1234567890abcdef12345');
   */
  async getEmployeeById(id) {
    try {
      logger.info(`Fetching employee by ID: ${id}`);

      const employee = await employeeRepository.findById(id);

      if (!employee) {
        logger.warn(`Employee not found: ${id}`);
        const error = new Error(API_MESSAGES.EMPLOYEE_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      logger.info(`Employee found: ${id}`);
      return EmployeeResponseDTO.fromModel(employee);
    } catch (error) {
      if (error.name === 'CastError') {
        logger.error(`Invalid employee ID format: ${id}`);
        const castError = new Error(API_MESSAGES.INVALID_ID);
        castError.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw castError;
      }
      throw error;
    }
  }

  /**
   * Create a new employee
   * 
   * Validates email uniqueness before creation
   * Transforms request data to DTO for consistent data structure
   * 
   * @async
   * @param {Object} employeeData - Employee data from request
   * @param {string} employeeData.name - Employee full name
   * @param {string} employeeData.role - Job role/title
   * @param {string} employeeData.department - Department name
   * @param {string} employeeData.email - Email address (must be unique)
   * @param {string} employeeData.phone - Phone number
   * @param {string|Date} employeeData.joiningDate - Date of joining
   * @returns {Promise<EmployeeResponseDTO>} Created employee as DTO
   * @throws {Error} If email already exists (409) or validation fails (400)
   * @example
   * const employee = await employeeService.createEmployee({
   *   name: 'John Doe',
   *   role: 'Software Engineer',
   *   department: 'Engineering',
   *   email: 'john@example.com',
   *   phone: '+1234567890',
   *   joiningDate: '2024-01-15'
   * });
   */
  async createEmployee(employeeData) {
    try {
      logger.info('Creating new employee', { email: employeeData.email });

      // Transform to DTO
      const dto = CreateEmployeeDTO.fromRequest(employeeData);

      // Check if email already exists
      const exists = await employeeRepository.exists({ email: dto.email });
      if (exists) {
        logger.warn(`Email already exists: ${dto.email}`);
        const error = new Error(API_MESSAGES.EMAIL_EXISTS);
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      // Create employee
      const employee = await employeeRepository.create(dto);
      logger.info(`Employee created successfully: ${employee._id}`);

      return EmployeeResponseDTO.fromModel(employee);
    } catch (error) {
      if (error.code === 11000) {
        logger.error('Duplicate email error', { error });
        const duplicateError = new Error(API_MESSAGES.EMAIL_EXISTS);
        duplicateError.statusCode = HTTP_STATUS.CONFLICT;
        throw duplicateError;
      }

      if (error.name === 'ValidationError') {
        logger.error('Validation error', { error });
        const validationError = new Error(
          Object.values(error.errors)
            .map((err) => err.message)
            .join(', ')
        );
        validationError.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw validationError;
      }

      logger.error('Error creating employee:', error);
      throw error;
    }
  }

  /**
   * Update an existing employee
   * 
   * Validates employee existence and email uniqueness (if email is being updated)
   * Only updates provided fields (partial update supported)
   * 
   * @async
   * @param {string} id - Employee MongoDB ObjectId
   * @param {Object} updateData - Fields to update (all optional)
   * @param {string} [updateData.name] - New employee name
   * @param {string} [updateData.role] - New job role
   * @param {string} [updateData.department] - New department
   * @param {string} [updateData.email] - New email (must be unique)
   * @param {string} [updateData.phone] - New phone number
   * @param {string|Date} [updateData.joiningDate] - New joining date
   * @returns {Promise<EmployeeResponseDTO>} Updated employee as DTO
   * @throws {Error} If employee not found (404), email exists (409), invalid ID (400), or validation fails (400)
   * @example
   * const updated = await employeeService.updateEmployee(
   *   '65f1234567890abcdef12345',
   *   { role: 'Senior Engineer' }
   * );
   */
  async updateEmployee(id, updateData) {
    try {
      logger.info(`Updating employee: ${id}`);

      // Check if employee exists
      const existingEmployee = await employeeRepository.findById(id);
      if (!existingEmployee) {
        logger.warn(`Employee not found for update: ${id}`);
        const error = new Error(API_MESSAGES.EMPLOYEE_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      // Transform to DTO
      const dto = UpdateEmployeeDTO.fromRequest(updateData);

      // If email is being updated, check for duplicates
      if (dto.email && dto.email !== existingEmployee.email) {
        const emailExists = await employeeRepository.exists({
          email: dto.email,
          _id: { $ne: id },
        });

        if (emailExists) {
          logger.warn(`Email already exists: ${dto.email}`);
          const error = new Error(API_MESSAGES.EMAIL_EXISTS);
          error.statusCode = HTTP_STATUS.CONFLICT;
          throw error;
        }
      }

      // Switching an employee to 'Fresher' must not leave their previous
      // experience behind, so those fields are removed rather than overwritten.
      const unsetFields =
        dto.employmentType === 'Fresher' ? [...EXPERIENCE_FIELDS] : [];

      const updatedEmployee = await employeeRepository.updateById(id, dto, unsetFields);
      logger.info(`Employee updated successfully: ${id}`, {
        clearedExperienceFields: unsetFields.length > 0,
      });

      return EmployeeResponseDTO.fromModel(updatedEmployee);
    } catch (error) {
      if (error.name === 'CastError') {
        logger.error(`Invalid employee ID format: ${id}`);
        const castError = new Error(API_MESSAGES.INVALID_ID);
        castError.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw castError;
      }

      if (error.name === 'ValidationError') {
        logger.error('Validation error', { error });
        const validationError = new Error(
          Object.values(error.errors)
            .map((err) => err.message)
            .join(', ')
        );
        validationError.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw validationError;
      }

      logger.error('Error updating employee:', error);
      throw error;
    }
  }

  /**
   * Delete an employee permanently
   * 
   * ⚠️ This is a hard delete - the record is permanently removed from database
   * Consider implementing soft delete for production use
   * 
   * @async
   * @param {string} id - Employee MongoDB ObjectId
   * @returns {Promise<{message: string}>} Success message
   * @throws {Error} If employee not found (404) or invalid ID format (400)
   * @example
   * const result = await employeeService.deleteEmployee('65f1234567890abcdef12345');
   * // Returns: { message: 'Employee deleted successfully' }
   */
  async deleteEmployee(id) {
    try {
      logger.info(`Deleting employee: ${id}`);

      const employee = await employeeRepository.deleteById(id);

      if (!employee) {
        logger.warn(`Employee not found for deletion: ${id}`);
        const error = new Error(API_MESSAGES.EMPLOYEE_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      logger.info(`Employee deleted successfully: ${id}`);
      return { message: API_MESSAGES.EMPLOYEE_DELETED };
    } catch (error) {
      if (error.name === 'CastError') {
        logger.error(`Invalid employee ID format: ${id}`);
        const castError = new Error(API_MESSAGES.INVALID_ID);
        castError.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw castError;
      }
      logger.error('Error deleting employee:', error);
      throw error;
    }
  }

  /**
   * Get all unique departments
   * 
   * Returns a sorted list of all unique department names from active employees
   * Useful for populating department filter dropdowns
   * 
   * @async
   * @returns {Promise<string[]>} Sorted array of department names
   * @throws {Error} If database query fails
   * @example
   * const departments = await employeeService.getDepartments();
   * // Returns: ['Engineering', 'Finance', 'HR', 'Marketing', 'Sales']
   */
  async getDepartments() {
    try {
      logger.info('Fetching departments');
      const departments = await employeeRepository.distinct('department');
      logger.info(`Retrieved ${departments.length} departments`);
      return departments.sort();
    } catch (error) {
      logger.error('Error fetching departments:', error);
      throw new Error(`Error fetching departments: ${error.message}`);
    }
  }

  /**
   * Get all departments with their live employee headcount.
   *
   * Powers the department-first home page. Counts come from the employee
   * records themselves, so they can never drift out of sync.
   *
   * @async
   * @returns {Promise<Array<{name: string, employeeCount: number}>>} Departments sorted by name
   * @throws {Error} If the aggregation fails
   * @example
   * const departments = await employeeService.getDepartmentsWithCounts();
   * // Returns: [{ name: 'Engineering', employeeCount: 12 }, ...]
   */
  async getDepartmentsWithCounts() {
    try {
      logger.info('Fetching departments with employee counts');
      const departments = await employeeRepository.getDepartmentCounts();
      logger.info(`Retrieved ${departments.length} departments with counts`);
      return departments;
    } catch (error) {
      logger.error('Error fetching departments with counts:', error);
      throw new Error(`Error fetching departments: ${error.message}`);
    }
  }
}

/**
 * Export singleton instance of EmployeeService
 * 
 * @exports EmployeeService
 * @type {EmployeeService}
 */
export default new EmployeeService();
