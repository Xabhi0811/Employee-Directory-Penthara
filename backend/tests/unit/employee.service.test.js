/**
 * Employee Service Unit Tests
 * Tests the business logic layer in isolation with a mocked repository.
 *
 * NOTE: This project runs native ES modules, so `jest.mock()` with a factory is
 * not supported. Module mocks must be registered with
 * `jest.unstable_mockModule()` BEFORE the module under test is imported, which
 * requires dynamic `await import()`.
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { HTTP_STATUS } from '../../../shared/constants/http.constants.js';

// --- Mock the repository before importing the service ---
const mockRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  count: jest.fn(),
  distinct: jest.fn(),
  exists: jest.fn(),
};

jest.unstable_mockModule('../../src/repositories/employee.repository.js', () => ({
  default: mockRepository,
}));

// Imported dynamically so the mock above is applied first
let employeeService;

beforeAll(async () => {
  employeeService = (await import('../../src/services/employee.service.js')).default;
});

beforeEach(() => {
  // jest.config.js sets resetMocks/restoreMocks, so re-establish safe defaults
  Object.values(mockRepository).forEach((fn) => fn.mockReset());
});

describe('Employee Service', () => {
  describe('getAllEmployees', () => {
    it('should return employees with pagination metadata', async () => {
      const mockEmployees = [
        { _id: '1', name: 'John Doe', email: 'john@test.com' },
        { _id: '2', name: 'Jane Smith', email: 'jane@test.com' },
      ];

      mockRepository.findAll.mockResolvedValue(mockEmployees);
      mockRepository.count.mockResolvedValue(10);

      const result = await employeeService.getAllEmployees({}, { page: 1, limit: 2 }, {});

      expect(result.employees).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 10,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: false,
      });
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(mockRepository.count).toHaveBeenCalled();
    });

    it('should map results through the response DTO', async () => {
      mockRepository.findAll.mockResolvedValue([
        { _id: 'abc123', name: 'John Doe', email: 'john@test.com', role: 'Dev' },
      ]);
      mockRepository.count.mockResolvedValue(1);

      const result = await employeeService.getAllEmployees();

      // DTO exposes `id` (string) and hides `_id`
      expect(result.employees[0].id).toBe('abc123');
      expect(result.employees[0]._id).toBeUndefined();
    });

    it('should sanitize the search term to prevent ReDoS', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(0);

      await employeeService.getAllEmployees({ search: '<script>alert("xss")</script>' }, {}, {});

      // Special characters stripped, converted to a MongoDB text search
      const queryArg = mockRepository.findAll.mock.calls[0][0];
      expect(queryArg.$text).toBeDefined();
      expect(queryArg.$text.$search).toBe('scriptalertxssscript');
    });

    it('should clamp out-of-range pagination parameters', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(0);

      const result = await employeeService.getAllEmployees({}, { page: -1, limit: 1000 }, {});

      expect(result.pagination.page).toBe(1); // floor of 1
      expect(result.pagination.limit).toBe(100); // ceiling of 100
    });

    it('should fall back to createdAt for an invalid sort field', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(0);

      await employeeService.getAllEmployees({}, {}, { sortBy: 'maliciousField', order: 'asc' });

      const options = mockRepository.findAll.mock.calls[0][1];
      expect(options.sort).toEqual({ createdAt: 1 });
    });

    it('should wrap repository errors with context', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('db down'));
      mockRepository.count.mockResolvedValue(0);

      await expect(employeeService.getAllEmployees()).rejects.toThrow(
        'Error fetching employees: db down'
      );
    });
  });

  describe('getEmployeeById', () => {
    it('should return the employee for a valid id', async () => {
      mockRepository.findById.mockResolvedValue({
        _id: '1',
        name: 'John Doe',
        email: 'john@test.com',
      });

      const result = await employeeService.getEmployeeById('1');

      expect(result.name).toBe('John Doe');
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw 404 when the employee does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(employeeService.getEmployeeById('999')).rejects.toMatchObject({
        message: 'Employee not found',
        statusCode: HTTP_STATUS.NOT_FOUND,
      });
    });

    it('should translate a CastError into a 400', async () => {
      const castError = new Error('cast failed');
      castError.name = 'CastError';
      mockRepository.findById.mockRejectedValue(castError);

      await expect(employeeService.getEmployeeById('invalid')).rejects.toMatchObject({
        statusCode: HTTP_STATUS.BAD_REQUEST,
      });
    });
  });

  describe('createEmployee', () => {
    const employeeData = {
      name: 'John Doe',
      role: 'Developer',
      department: 'Engineering',
      email: 'John@Test.com',
      phone: '+1234567890',
      joiningDate: '2024-01-01',
    };

    it('should create a new employee', async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue({ _id: '1', ...employeeData });

      const result = await employeeService.createEmployee(employeeData);

      expect(result.name).toBe('John Doe');
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should normalize the email to lowercase before the uniqueness check', async () => {
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue({ _id: '1', ...employeeData });

      await employeeService.createEmployee(employeeData);

      expect(mockRepository.exists).toHaveBeenCalledWith({ email: 'john@test.com' });
    });

    it('should throw 409 for a duplicate email', async () => {
      mockRepository.exists.mockResolvedValue(true);

      await expect(employeeService.createEmployee(employeeData)).rejects.toMatchObject({
        statusCode: HTTP_STATUS.CONFLICT,
      });

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should translate a Mongo duplicate key error (11000) into a 409', async () => {
      mockRepository.exists.mockResolvedValue(false);
      const dupError = new Error('E11000');
      dupError.code = 11000;
      mockRepository.create.mockRejectedValue(dupError);

      await expect(employeeService.createEmployee(employeeData)).rejects.toMatchObject({
        statusCode: HTTP_STATUS.CONFLICT,
      });
    });

    it('should translate a ValidationError into a 400', async () => {
      mockRepository.exists.mockResolvedValue(false);
      const validationError = new Error('validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = { name: { message: 'Name is required' } };
      mockRepository.create.mockRejectedValue(validationError);

      await expect(employeeService.createEmployee(employeeData)).rejects.toMatchObject({
        message: 'Name is required',
        statusCode: HTTP_STATUS.BAD_REQUEST,
      });
    });
  });

  describe('updateEmployee', () => {
    it('should update an existing employee', async () => {
      const existing = { _id: '1', name: 'John Doe', email: 'john@test.com' };
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.updateById.mockResolvedValue({ ...existing, name: 'John Updated' });

      const result = await employeeService.updateEmployee('1', { name: 'John Updated' });

      expect(result.name).toBe('John Updated');
      // Third argument is the list of fields to $unset - empty when employment
      // type is not being changed to 'Fresher'.
      expect(mockRepository.updateById).toHaveBeenCalledWith('1', { name: 'John Updated' }, []);
    });

    it('should clear previous-experience fields when switching to Fresher', async () => {
      const existing = {
        _id: '1',
        name: 'John Doe',
        email: 'john@test.com',
        employmentType: 'Experienced',
      };
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.updateById.mockResolvedValue({
        ...existing,
        employmentType: 'Fresher',
      });

      await employeeService.updateEmployee('1', { employmentType: 'Fresher' });

      const [, updateData, unsetFields] = mockRepository.updateById.mock.calls[0];
      expect(updateData.employmentType).toBe('Fresher');
      expect(unsetFields).toEqual(
        expect.arrayContaining([
          'yearsOfExperience',
          'previousOrganization',
          'previousRole',
          'previousExperienceDescription',
        ])
      );
    });

    it('should keep experience fields when switching to Experienced', async () => {
      const existing = { _id: '1', name: 'John Doe', email: 'john@test.com' };
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.updateById.mockResolvedValue(existing);

      await employeeService.updateEmployee('1', {
        employmentType: 'Experienced',
        yearsOfExperience: '4',
        previousOrganization: 'ABC Technologies',
        previousRole: 'Senior Developer',
        previousExperienceDescription: 'Worked on scalable React applications.',
      });

      const [, updateData, unsetFields] = mockRepository.updateById.mock.calls[0];
      expect(unsetFields).toEqual([]);
      // Numeric coercion happens in the DTO so the model receives a real number
      expect(updateData.yearsOfExperience).toBe(4);
      expect(updateData.previousOrganization).toBe('ABC Technologies');
    });

    it('should throw 404 when updating a non-existent employee', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        employeeService.updateEmployee('999', { name: 'Test' })
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.NOT_FOUND });

      expect(mockRepository.updateById).not.toHaveBeenCalled();
    });

    it('should throw 409 when the new email belongs to another employee', async () => {
      mockRepository.findById.mockResolvedValue({ _id: '1', email: 'john@test.com' });
      mockRepository.exists.mockResolvedValue(true);

      await expect(
        employeeService.updateEmployee('1', { email: 'taken@test.com' })
      ).rejects.toMatchObject({ statusCode: HTTP_STATUS.CONFLICT });
    });

    it('should skip the uniqueness check when the email is unchanged', async () => {
      const existing = { _id: '1', email: 'john@test.com' };
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.updateById.mockResolvedValue(existing);

      await employeeService.updateEmployee('1', { email: 'john@test.com' });

      expect(mockRepository.exists).not.toHaveBeenCalled();
    });
  });

  describe('deleteEmployee', () => {
    it('should delete an employee', async () => {
      mockRepository.deleteById.mockResolvedValue({ _id: '1', name: 'John Doe' });

      const result = await employeeService.deleteEmployee('1');

      expect(result.message).toBe('Employee deleted successfully');
      expect(mockRepository.deleteById).toHaveBeenCalledWith('1');
    });

    it('should throw 404 when deleting a non-existent employee', async () => {
      mockRepository.deleteById.mockResolvedValue(null);

      await expect(employeeService.deleteEmployee('999')).rejects.toMatchObject({
        statusCode: HTTP_STATUS.NOT_FOUND,
      });
    });
  });

  describe('getDepartments', () => {
    it('should return an alphabetically sorted department list', async () => {
      mockRepository.distinct.mockResolvedValue(['Engineering', 'HR', 'Finance']);

      const result = await employeeService.getDepartments();

      expect(result).toEqual(['Engineering', 'Finance', 'HR']);
      expect(mockRepository.distinct).toHaveBeenCalledWith('department');
    });

    it('should wrap repository errors with context', async () => {
      mockRepository.distinct.mockRejectedValue(new Error('db down'));

      await expect(employeeService.getDepartments()).rejects.toThrow(
        'Error fetching departments: db down'
      );
    });
  });
});
