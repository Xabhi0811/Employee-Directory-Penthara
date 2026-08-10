/**
 * Employee Service
 * Handles all employee-related API calls
 * Follows Single Responsibility Principle
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * Get all employees with optional filters
 * @param {Object} filters - Optional search and department filters
 * @returns {Promise<Array>} - Array of employees
 */
export const getEmployees = async (filters = {}) => {
  const { search, department } = filters;
  const params = new URLSearchParams();

  if (search) params.append('search', search);
  if (department) params.append('department', department);

  const queryString = params.toString();
  const url = queryString
    ? `${API_ENDPOINTS.EMPLOYEES}?${queryString}`
    : API_ENDPOINTS.EMPLOYEES;

  const response = await api.get(url);
  return response.data.data;
};

/**
 * Get single employee by ID
 * @param {string} id - Employee ID
 * @returns {Promise<Object>} - Employee object
 */
export const getEmployee = async (id) => {
  const response = await api.get(API_ENDPOINTS.EMPLOYEE_BY_ID(id));
  return response.data.data;
};

/**
 * Create new employee
 * @param {Object} employeeData - Employee data
 * @returns {Promise<Object>} - Created employee object
 */
export const createEmployee = async (employeeData) => {
  const response = await api.post(API_ENDPOINTS.EMPLOYEES, employeeData);
  return response.data.data;
};

/**
 * Update existing employee
 * @param {string} id - Employee ID
 * @param {Object} employeeData - Updated employee data
 * @returns {Promise<Object>} - Updated employee object
 */
export const updateEmployee = async (id, employeeData) => {
  const response = await api.put(
    API_ENDPOINTS.EMPLOYEE_BY_ID(id),
    employeeData
  );
  return response.data.data;
};

/**
 * Delete employee
 * @param {string} id - Employee ID
 * @returns {Promise<void>}
 */
export const deleteEmployee = async (id) => {
  await api.delete(API_ENDPOINTS.EMPLOYEE_BY_ID(id));
};

/**
 * Get all unique departments
 * @returns {Promise<Array<string>>} - Array of department names
 */
export const getDepartments = async () => {
  const response = await api.get(API_ENDPOINTS.DEPARTMENTS);
  return response.data.data;
};

/**
 * Get all departments with their live employee counts
 * @returns {Promise<Array<{name: string, employeeCount: number}>>}
 */
export const getDepartmentsWithCounts = async () => {
  const response = await api.get(API_ENDPOINTS.DEPARTMENTS_WITH_COUNTS);
  return response.data.data;
};
