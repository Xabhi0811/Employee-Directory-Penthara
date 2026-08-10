/**
 * Employee Model Tests
 *
 * Covers the schema's own behaviour: validation rules, normalisation hooks,
 * virtuals, soft-delete/archive instance methods, static query helpers and the
 * serialisation transform that keeps internal flags out of API responses.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Employee from '../../src/models/Employee.js';

let mongoServer;

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
  await Employee.createIndexes();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Employee.deleteMany({});
});

describe('Employee model', () => {
  describe('validation', () => {
    it('should require name, role, department, email, phone and joiningDate', async () => {
      const err = await new Employee({}).validate().catch((e) => e);

      expect(err.name).toBe('ValidationError');
      ['name', 'role', 'department', 'email', 'phone', 'joiningDate'].forEach((field) => {
        expect(err.errors[field]).toBeDefined();
      });
    });

    it('should reject a name shorter than 2 characters', async () => {
      const err = await new Employee(makeEmployee({ name: 'A' })).validate().catch((e) => e);

      expect(err.errors.name).toBeDefined();
    });

    it('should reject a name longer than 100 characters', async () => {
      const err = await new Employee(makeEmployee({ name: 'a'.repeat(101) }))
        .validate()
        .catch((e) => e);

      expect(err.errors.name).toBeDefined();
    });

    it.each(['plainstring', 'missing@domain', '@nolocal.com', 'spa ce@example.com'])(
      'should reject the malformed email %s',
      async (email) => {
        const err = await new Employee(makeEmployee({ email })).validate().catch((e) => e);

        expect(err.errors.email).toBeDefined();
      }
    );

    it('should reject a phone number that is too short', async () => {
      const err = await new Employee(makeEmployee({ phone: '123' })).validate().catch((e) => e);

      expect(err.errors.phone).toBeDefined();
    });

    it('should reject a joining date in the future', async () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);

      const err = await new Employee(makeEmployee({ joiningDate: future }))
        .validate()
        .catch((e) => e);

      expect(err.errors.joiningDate).toBeDefined();
    });

    it('should accept a joining date of today', async () => {
      await expect(
        new Employee(makeEmployee({ joiningDate: new Date() })).validate()
      ).resolves.toBeUndefined();
    });

    it('should enforce email uniqueness at the database level', async () => {
      await Employee.create(makeEmployee({ email: 'dupe@example.com' }));

      const err = await Employee.create(makeEmployee({ email: 'dupe@example.com' })).catch(
        (e) => e
      );

      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('defaults and normalisation', () => {
    it('should default isActive to true and isArchived to false', async () => {
      const created = await Employee.create(makeEmployee());

      expect(created.isActive).toBe(true);
      expect(created.isArchived).toBe(false);
    });

    it('should lowercase the email and trim string fields on save', async () => {
      const created = await Employee.create(
        makeEmployee({
          name: '  John Doe  ',
          role: '  Engineer  ',
          department: '  Engineering  ',
          email: '  MixedCase@Example.COM  ',
        })
      );

      expect(created.email).toBe('mixedcase@example.com');
      expect(created.name).toBe('John Doe');
      expect(created.role).toBe('Engineer');
      expect(created.department).toBe('Engineering');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const created = await Employee.create(makeEmployee());

      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('virtuals', () => {
    it('should compose fullInfo from name, role and department', async () => {
      const employee = new Employee(
        makeEmployee({ name: 'John Doe', role: 'Engineer', department: 'Platform' })
      );

      expect(employee.fullInfo).toBe('John Doe - Engineer (Platform)');
    });

    it('should compute yearsOfService from the joining date', async () => {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      threeYearsAgo.setDate(threeYearsAgo.getDate() - 1); // avoid boundary rounding

      const employee = new Employee(makeEmployee({ joiningDate: threeYearsAgo }));

      expect(employee.yearsOfService).toBe(3);
    });

    it('should report zero years of service for a recent joiner', async () => {
      const employee = new Employee(makeEmployee({ joiningDate: new Date() }));

      expect(employee.yearsOfService).toBe(0);
    });
  });

  describe('instance methods', () => {
    it('softDelete should mark the employee inactive', async () => {
      const employee = await Employee.create(makeEmployee());

      await employee.softDelete();

      expect(employee.isActive).toBe(false);
      const persisted = await Employee.findById(employee._id);
      expect(persisted.isActive).toBe(false);
    });

    it('archive should mark the employee archived', async () => {
      const employee = await Employee.create(makeEmployee());

      await employee.archive();

      const persisted = await Employee.findById(employee._id);
      expect(persisted.isArchived).toBe(true);
    });

    it('restore should reverse both soft delete and archive', async () => {
      const employee = await Employee.create(
        makeEmployee({ isActive: false, isArchived: true })
      );

      await employee.restore();

      const persisted = await Employee.findById(employee._id);
      expect(persisted.isActive).toBe(true);
      expect(persisted.isArchived).toBe(false);
    });
  });

  describe('static helpers', () => {
    it('findActive should exclude inactive and archived employees', async () => {
      await Employee.create(makeEmployee({ name: 'Visible' }));
      await Employee.create(makeEmployee({ name: 'Deleted', isActive: false }));
      await Employee.create(makeEmployee({ name: 'Archived', isArchived: true }));

      const results = await Employee.findActive();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Visible');
    });

    it('findActive should apply an extra query filter', async () => {
      await Employee.create(makeEmployee({ department: 'Engineering' }));
      await Employee.create(makeEmployee({ department: 'Design' }));

      const results = await Employee.findActive({ department: 'Design' });

      expect(results).toHaveLength(1);
    });

    it('countActive should count only active, non-archived employees', async () => {
      await Employee.create(makeEmployee());
      await Employee.create(makeEmployee());
      await Employee.create(makeEmployee({ isActive: false }));

      await expect(Employee.countActive()).resolves.toBe(2);
    });

    it('findPaginated should return the requested page and a total', async () => {
      await Employee.create(
        Array.from({ length: 12 }, (_, i) => makeEmployee({ name: `Employee ${i + 1}` }))
      );

      const { results, total } = await Employee.findPaginated({}, 2, 5, { createdAt: -1 });

      expect(results).toHaveLength(5);
      expect(total).toBe(12);
    });

    it('bulkCreate should insert many employees at once', async () => {
      const payload = Array.from({ length: 4 }, () => makeEmployee());

      await Employee.bulkCreate(payload);

      await expect(Employee.countDocuments()).resolves.toBe(4);
    });
  });

  describe('serialisation', () => {
    it('toJSON should expose id and hide internal fields', async () => {
      const employee = await Employee.create(makeEmployee());

      const json = employee.toJSON();

      expect(json.id).toBe(employee._id.toString());
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.isActive).toBeUndefined();
      expect(json.isArchived).toBeUndefined();
    });

    it('toObject should expose id and drop _id', async () => {
      const employee = await Employee.create(makeEmployee());

      const obj = employee.toObject();

      expect(obj.id).toBe(employee._id.toString());
      expect(obj._id).toBeUndefined();
    });
  });
});
