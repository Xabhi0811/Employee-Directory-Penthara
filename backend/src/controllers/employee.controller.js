import { validationResult } from 'express-validator';
import employeeService from '../services/employee.service.js';
import { HTTP_STATUS, API_MESSAGES } from '../../shared/constants/http.constants.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Employee Controller
 * Handles HTTP requests and responses for employee operations
 * Follows Single Responsibility Principle
 */
class EmployeeController {
  /**
   * Get all employees with optional search, pagination, and sorting
   * GET /api/employees?search=term&department=dept&page=1&limit=10&sortBy=name&order=asc
   */
  async getAllEmployees(req, res, next) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in getAllEmployees', { errors: errors.array() });
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          API_MESSAGES.VALIDATION_ERROR,
          errors.array()
        );
      }

      const { search, department, page, limit, sortBy, order } = req.query;

      // Build filters
      const filters = {};
      if (search) filters.search = search;
      if (department) filters.department = department;

      // Build pagination
      const pagination = { page, limit };

      // Build sorting
      const sorting = { sortBy, order };

      const result = await employeeService.getAllEmployees(
        filters,
        pagination,
        sorting
      );

      logger.info('Employees retrieved successfully', {
        count: result.employees.length,
        page: result.pagination.page,
      });

      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        API_MESSAGES.EMPLOYEE_FETCHED,
        result.employees,
        result.pagination
      );
    } catch (error) {
      logger.error('Error in getAllEmployees controller:', error);
      next(error);
    }
  }

  /**
   * Get single employee by ID
   * GET /api/employees/:id
   */
  async getEmployeeById(req, res, next) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in getEmployeeById', { errors: errors.array() });
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          API_MESSAGES.VALIDATION_ERROR,
          errors.array()
        );
      }

      const { id } = req.params;
      const employee = await employeeService.getEmployeeById(id);

      logger.info(`Employee retrieved: ${id}`);
      return sendSuccess(res, HTTP_STATUS.OK, 'Employee retrieved', employee);
    } catch (error) {
      logger.error('Error in getEmployeeById controller:', error);
      next(error);
    }
  }

  /**
   * Create new employee
   * POST /api/employees
   */
  async createEmployee(req, res, next) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in createEmployee', { errors: errors.array() });
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          API_MESSAGES.VALIDATION_ERROR,
          errors.array()
        );
      }

      const employeeData = req.body;
      const employee = await employeeService.createEmployee(employeeData);

      logger.info('Employee created', { id: employee.id });
      return sendSuccess(
        res,
        HTTP_STATUS.CREATED,
        API_MESSAGES.EMPLOYEE_CREATED,
        employee
      );
    } catch (error) {
      logger.error('Error in createEmployee controller:', error);
      next(error);
    }
  }

  /**
   * Update existing employee
   * PUT /api/employees/:id
   */
  async updateEmployee(req, res, next) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in updateEmployee', { errors: errors.array() });
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          API_MESSAGES.VALIDATION_ERROR,
          errors.array()
        );
      }

      const { id } = req.params;
      const updateData = req.body;
      const employee = await employeeService.updateEmployee(id, updateData);

      logger.info('Employee updated', { id });
      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        API_MESSAGES.EMPLOYEE_UPDATED,
        employee
      );
    } catch (error) {
      logger.error('Error in updateEmployee controller:', error);
      next(error);
    }
  }

  /**
   * Delete employee
   * DELETE /api/employees/:id
   */
  async deleteEmployee(req, res, next) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation errors in deleteEmployee', { errors: errors.array() });
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          API_MESSAGES.VALIDATION_ERROR,
          errors.array()
        );
      }

      const { id } = req.params;
      await employeeService.deleteEmployee(id);

      logger.info('Employee deleted', { id });
      return sendSuccess(res, HTTP_STATUS.OK, API_MESSAGES.EMPLOYEE_DELETED);
    } catch (error) {
      logger.error('Error in deleteEmployee controller:', error);
      next(error);
    }
  }

  /**
   * Get all unique departments
   * GET /api/employees/departments/list
   */
  async getDepartments(req, res, next) {
    try {
      const departments = await employeeService.getDepartments();

      logger.info('Departments retrieved', { count: departments.length });
      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        'Departments retrieved',
        departments
      );
    } catch (error) {
      logger.error('Error in getDepartments controller:', error);
      next(error);
    }
  }

  /**
   * Get all departments with live employee counts
   * GET /api/departments
   */
  async getDepartmentsWithCounts(req, res, next) {
    try {
      const departments = await employeeService.getDepartmentsWithCounts();

      logger.info('Departments with counts retrieved', {
        count: departments.length,
      });
      return sendSuccess(
        res,
        HTTP_STATUS.OK,
        'Departments retrieved',
        departments
      );
    } catch (error) {
      logger.error('Error in getDepartmentsWithCounts controller:', error);
      next(error);
    }
  }
}

export default new EmployeeController();
