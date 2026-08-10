/**
 * Employee Repository Tests
 * Exercises the data-access layer against a real in-memory MongoDB instance.
 *
 * A real database is used (rather than mocks) because the repository's value is
 * in its query construction: lean projections, index hints, soft-delete filters
 * and the text index. Mocking Mongoose would test nothing meaningful.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Employee from '../../src/models/Employee.js';
import employeeRepository from '../../src/repositories/employee.repository.js';

let mongoServer;

/** Build a valid employee payload with a unique email. */
const makeEmployee = (overrides = {}) => ({
  name: 'John Doe',
  role: 'React JS Developer',
  department: 'Engineering',
  email: `user${Math.random().toString(36).slice(2, 10)}@example.com`,
  phone: '+1234567890',
  joiningDate: new Date('2024-01-01'),
  employmentType: 'Fresher',
  ...overrides,
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // The repository uses .hint() with named indexes, so the indexes declared on
  // the schema must exist before any query runs.
  await Employee.createIndexes();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Employee.deleteMany({});
});

describe('Employee Repository', () => {
  describe('findAll', () => {
    it('should return only active, non-archived employees', async () => {
      await Employee.create(makeEmployee({ name: 'Active Employee' }));
      await Employee.create(makeEmployee({ name: 'Inactive Employee', isActive: false }));
      await Employee.create(makeEmployee({ name: 'Archived Employee', isArchived: true }));

      const employees = await employeeRepository.findAll();

      expect(employees).toHaveLength(1);
      expect(employees[0].name).toBe('Active Employee');
    });

    it('should include inactive employees when explicitly requested', async () => {
      await Employee.create(makeEmployee({ name: 'Active' }));
      await Employee.create(makeEmployee({ name: 'Inactive', isActive: false }));

      const employees = await employeeRepository.findAll({}, { includeInactive: true });

      expect(employees).toHaveLength(2);
    });

    it('should apply skip and limit for pagination', async () => {
      await Employee.create(
        Array.from({ length: 15 }, (_, i) => makeEmployee({ name: `Employee ${i + 1}` }))
      );

      const page2 = await employeeRepository.findAll({}, { skip: 10, limit: 5 });

      expect(page2).toHaveLength(5);
    });

    it('should return lean plain objects rather than Mongoose documents', async () => {
      await Employee.create(makeEmployee());

      const [employee] = await employeeRepository.findAll();

      expect(employee._id).toBeDefined();
      expect(employee.save).toBeUndefined(); // no Mongoose document methods
    });

    it('should honour a projection when select is provided', async () => {
      await Employee.create(makeEmployee());

      const [employee] = await employeeRepository.findAll({}, { select: 'name email' });

      expect(employee.name).toBeDefined();
      expect(employee.email).toBeDefined();
      expect(employee.role).toBeUndefined();
    });

    it('should sort by name ascending when requested', async () => {
      await Employee.create(makeEmployee({ name: 'Zoe' }));
      await Employee.create(makeEmployee({ name: 'Adam' }));

      const employees = await employeeRepository.findAll({}, { sort: { name: 1 } });

      expect(employees.map((e) => e.name)).toEqual(['Adam', 'Zoe']);
    });

    it('should filter by department', async () => {
      await Employee.create(makeEmployee({ name: 'Eng', department: 'Engineering' }));
      await Employee.create(makeEmployee({ name: 'Des', department: 'Design' }));

      const employees = await employeeRepository.findAll({ department: 'Design' });

      expect(employees).toHaveLength(1);
      expect(employees[0].name).toBe('Des');
    });

    it('should sort by a field that has no dedicated index', async () => {
      // Guards the index-hint fallback path: _getOptimalIndex returns no hint
      // for unindexed sort fields, which must not break the query.
      await Employee.create(makeEmployee({ email: 'b@example.com' }));
      await Employee.create(makeEmployee({ email: 'a@example.com' }));

      const employees = await employeeRepository.findAll({}, { sort: { email: 1 } });

      expect(employees.map((e) => e.email)).toEqual(['a@example.com', 'b@example.com']);
    });
  });

  describe('findById', () => {
    it('should return the employee for an existing id', async () => {
      const created = await Employee.create(makeEmployee({ name: 'John Doe' }));

      const found = await employeeRepository.findById(created._id);

      expect(found).not.toBeNull();
      expect(found.name).toBe('John Doe');
    });

    it('should return null for an unknown id', async () => {
      const found = await employeeRepository.findById(new mongoose.Types.ObjectId());

      expect(found).toBeNull();
    });

    it('should not return a soft-deleted employee', async () => {
      const created = await Employee.create(makeEmployee({ isActive: false }));

      const found = await employeeRepository.findById(created._id);

      expect(found).toBeNull();
    });

    it('should reject an invalid id with a CastError', async () => {
      await expect(employeeRepository.findById('not-an-object-id')).rejects.toMatchObject({
        name: 'CastError',
      });
    });
  });

  describe('create', () => {
    it('should persist a new employee', async () => {
      const created = await employeeRepository.create(makeEmployee({ name: 'John Doe' }));

      // create() returns saved.toObject(), whose transform exposes `id` and removes `_id`
      expect(created.id).toBeDefined();
      expect(created.name).toBe('John Doe');

      const persisted = await Employee.findById(created.id);
      expect(persisted).not.toBeNull();
      expect(persisted.name).toBe('John Doe');
    });

    it('should lowercase the email on save', async () => {
      const created = await employeeRepository.create(
        makeEmployee({ email: 'MixedCase@Example.COM' })
      );

      expect(created.email).toBe('mixedcase@example.com');
    });

    it('should reject an employee that fails schema validation', async () => {
      await expect(
        employeeRepository.create(makeEmployee({ name: 'A' })) // below minlength
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('should reject a future joining date', async () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);

      await expect(
        employeeRepository.create(makeEmployee({ joiningDate: future }))
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('updateById', () => {
    it('should update the provided fields and leave others intact', async () => {
      const created = await Employee.create(
        makeEmployee({ name: 'John Doe', email: 'john@example.com' })
      );

      const updated = await employeeRepository.updateById(created._id, { name: 'John Updated' });

      expect(updated.name).toBe('John Updated');
      expect(updated.email).toBe('john@example.com');
    });

    it('should return null for an unknown id', async () => {
      const updated = await employeeRepository.updateById(new mongoose.Types.ObjectId(), {
        name: 'Test',
      });

      expect(updated).toBeNull();
    });

    it('should run schema validators on update', async () => {
      const created = await Employee.create(makeEmployee());

      await expect(
        employeeRepository.updateById(created._id, { email: 'not-an-email' })
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('deleteById', () => {
    it('should soft delete by setting isActive to false', async () => {
      const created = await Employee.create(makeEmployee());

      const deleted = await employeeRepository.deleteById(created._id);

      expect(deleted).not.toBeNull();
      expect(deleted.isActive).toBe(false);

      // Document still exists in the collection
      const persisted = await Employee.findById(created._id);
      expect(persisted).not.toBeNull();
      expect(persisted.isActive).toBe(false);
    });

    it('should return null for an unknown id', async () => {
      const deleted = await employeeRepository.deleteById(new mongoose.Types.ObjectId());

      expect(deleted).toBeNull();
    });

    it('should return null when the employee is already soft deleted', async () => {
      const created = await Employee.create(makeEmployee({ isActive: false }));

      const deleted = await employeeRepository.deleteById(created._id);

      expect(deleted).toBeNull();
    });
  });

  describe('count', () => {
    it('should count only active, non-archived employees', async () => {
      await Employee.create(makeEmployee({ name: 'Active One' }));
      await Employee.create(makeEmployee({ name: 'Active Two' }));
      await Employee.create(makeEmployee({ name: 'Gone', isActive: false }));

      const count = await employeeRepository.count();

      expect(count).toBe(2);
    });

    it('should respect an additional query filter', async () => {
      await Employee.create(makeEmployee({ department: 'Engineering' }));
      await Employee.create(makeEmployee({ department: 'Design' }));

      const count = await employeeRepository.count({ department: 'Engineering' });

      expect(count).toBe(1);
    });
  });

  describe('distinct', () => {
    it('should return unique department values', async () => {
      await Employee.create(makeEmployee({ department: 'Engineering' }));
      await Employee.create(makeEmployee({ department: 'Design' }));
      await Employee.create(makeEmployee({ department: 'Engineering' }));

      const departments = await employeeRepository.distinct('department');

      expect(departments).toHaveLength(2);
      expect(departments).toEqual(expect.arrayContaining(['Engineering', 'Design']));
    });

    it('should exclude departments of soft-deleted employees', async () => {
      await Employee.create(makeEmployee({ department: 'Engineering' }));
      await Employee.create(makeEmployee({ department: 'Ghosts', isActive: false }));

      const departments = await employeeRepository.distinct('department');

      expect(departments).toEqual(['Engineering']);
    });
  });

  describe('exists', () => {
    it('should return true when a matching active employee exists', async () => {
      await Employee.create(makeEmployee({ email: 'john@example.com' }));

      await expect(employeeRepository.exists({ email: 'john@example.com' })).resolves.toBe(true);
    });

    it('should return false when nothing matches', async () => {
      await expect(employeeRepository.exists({ email: 'nobody@example.com' })).resolves.toBe(
        false
      );
    });
  });

  describe('textSearch', () => {
    it('should find employees using the text index', async () => {
      await Employee.create(makeEmployee({ name: 'Alice', role: 'Bricklayer' }));
      await Employee.create(makeEmployee({ name: 'Bob', role: 'Astronaut' }));

      const results = await employeeRepository.textSearch('Astronaut');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Bob');
    });

    it('should exclude soft-deleted employees from text search', async () => {
      await Employee.create(makeEmployee({ role: 'Astronaut', isActive: false }));

      const results = await employeeRepository.textSearch('Astronaut');

      expect(results).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('should aggregate employee counts per department', async () => {
      await Employee.create(makeEmployee({ department: 'Engineering' }));
      await Employee.create(makeEmployee({ department: 'Engineering' }));
      await Employee.create(makeEmployee({ department: 'Design' }));

      const stats = await employeeRepository.getStatistics();

      const engineering = stats.find((s) => s.department === 'Engineering');
      const design = stats.find((s) => s.department === 'Design');

      expect(engineering.employeeCount).toBe(2);
      expect(design.employeeCount).toBe(1);
      // Sorted by count descending
      expect(stats[0].department).toBe('Engineering');
    });
  });
});
