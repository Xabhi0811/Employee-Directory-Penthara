/**
 * Shared Employee Validation Schema
 * Uses Zod for runtime validation across frontend and backend
 */

import { z } from 'zod';
import {
  VALIDATION_RULES,
  VALIDATION_MESSAGES,
  EMPLOYMENT_TYPES,
} from '../constants/validation.constants.js';

/**
 * Base employee shape.
 *
 * Kept as a plain ZodObject (no refinements) so it can be reused for both the
 * create schema and the partial update schema. Conditional rules are layered on
 * afterwards via `withEmploymentRules`, because `.partial()` is only available
 * on a ZodObject — applying a refinement first would make it unavailable.
 */
const employeeBaseSchema = z.object({
  name: z
    .string({
      required_error: VALIDATION_MESSAGES.REQUIRED('Name'),
    })
    .trim()
    .min(
      VALIDATION_RULES.NAME.MIN_LENGTH,
      VALIDATION_MESSAGES.MIN_LENGTH('Name', VALIDATION_RULES.NAME.MIN_LENGTH)
    )
    .max(
      VALIDATION_RULES.NAME.MAX_LENGTH,
      VALIDATION_MESSAGES.MAX_LENGTH('Name', VALIDATION_RULES.NAME.MAX_LENGTH)
    ),

  role: z
    .string({
      required_error: VALIDATION_MESSAGES.REQUIRED('Role'),
    })
    .trim()
    .min(
      VALIDATION_RULES.ROLE.MIN_LENGTH,
      VALIDATION_MESSAGES.MIN_LENGTH('Role', VALIDATION_RULES.ROLE.MIN_LENGTH)
    )
    .max(
      VALIDATION_RULES.ROLE.MAX_LENGTH,
      VALIDATION_MESSAGES.MAX_LENGTH('Role', VALIDATION_RULES.ROLE.MAX_LENGTH)
    ),

  department: z
    .string({
      required_error: VALIDATION_MESSAGES.REQUIRED('Department'),
    })
    .trim()
    .min(
      VALIDATION_RULES.DEPARTMENT.MIN_LENGTH,
      VALIDATION_MESSAGES.MIN_LENGTH(
        'Department',
        VALIDATION_RULES.DEPARTMENT.MIN_LENGTH
      )
    )
    .max(
      VALIDATION_RULES.DEPARTMENT.MAX_LENGTH,
      VALIDATION_MESSAGES.MAX_LENGTH(
        'Department',
        VALIDATION_RULES.DEPARTMENT.MAX_LENGTH
      )
    ),

  email: z
    .string({
      required_error: VALIDATION_MESSAGES.REQUIRED('Email'),
    })
    .trim()
    .toLowerCase()
    .email(VALIDATION_RULES.EMAIL.MESSAGE),

  phone: z
    .string({
      required_error: VALIDATION_MESSAGES.REQUIRED('Phone'),
    })
    .trim()
    .regex(VALIDATION_RULES.PHONE.PATTERN, VALIDATION_RULES.PHONE.MESSAGE),

  joiningDate: z
    .string({
      required_error: VALIDATION_MESSAGES.REQUIRED('Joining date'),
    })
    .or(z.date())
    .refine(
      (date) => {
        const parsedDate = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return parsedDate <= today;
      },
      {
        message: VALIDATION_RULES.JOINING_DATE.MESSAGE,
      }
    ),

  // Membership is checked with `refine` rather than `z.enum` so the message is
  // guaranteed regardless of the Zod major version's enum error API.
  employmentType: z
    .string({
      required_error: VALIDATION_RULES.EMPLOYMENT_TYPE.MESSAGE,
    })
    .trim()
    .refine((value) => EMPLOYMENT_TYPES.includes(value), {
      message: VALIDATION_RULES.EMPLOYMENT_TYPE.MESSAGE,
    }),

  // Previous-experience fields are permissive here and conditionally required
  // below, because they only apply when employmentType is 'Experienced'.
  yearsOfExperience: z.union([z.string(), z.number()]).optional(),
  previousOrganization: z.string().trim().max(VALIDATION_RULES.PREVIOUS_ORGANIZATION.MAX_LENGTH).optional(),
  previousRole: z.string().trim().max(VALIDATION_RULES.PREVIOUS_ROLE.MAX_LENGTH).optional(),
  previousExperienceDescription: z
    .string()
    .trim()
    .max(VALIDATION_RULES.PREVIOUS_EXPERIENCE_DESCRIPTION.MAX_LENGTH)
    .optional(),
});

/**
 * Treat null/undefined/blank as "not provided".
 */
const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === '';

/**
 * Layer the conditional previous-experience rules onto a schema.
 *
 * The checks only run when employmentType is explicitly 'Experienced', so a
 * partial update that does not touch employmentType is unaffected.
 *
 * @param {import('zod').ZodTypeAny} schema
 */
const withEmploymentRules = (schema) =>
  schema.superRefine((data, ctx) => {
    if (data.employmentType !== 'Experienced') {
      return;
    }

    const rules = VALIDATION_RULES.YEARS_OF_EXPERIENCE;

    if (isBlank(data.yearsOfExperience)) {
      ctx.addIssue({
        code: 'custom',
        path: ['yearsOfExperience'],
        message: rules.REQUIRED_MESSAGE,
      });
    } else {
      const years = Number(data.yearsOfExperience);

      if (Number.isNaN(years)) {
        ctx.addIssue({
          code: 'custom',
          path: ['yearsOfExperience'],
          message: rules.INVALID_MESSAGE,
        });
      } else if (years < rules.MIN) {
        ctx.addIssue({
          code: 'custom',
          path: ['yearsOfExperience'],
          message: rules.NEGATIVE_MESSAGE,
        });
      } else if (years > rules.MAX) {
        ctx.addIssue({
          code: 'custom',
          path: ['yearsOfExperience'],
          message: rules.MAX_MESSAGE,
        });
      }
    }

    const conditionalText = [
      ['previousOrganization', VALIDATION_RULES.PREVIOUS_ORGANIZATION],
      ['previousRole', VALIDATION_RULES.PREVIOUS_ROLE],
      ['previousExperienceDescription', VALIDATION_RULES.PREVIOUS_EXPERIENCE_DESCRIPTION],
    ];

    conditionalText.forEach(([field, fieldRules]) => {
      const value = data[field];

      if (isBlank(value)) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: fieldRules.REQUIRED_MESSAGE,
        });
      } else if (String(value).trim().length < fieldRules.MIN_LENGTH) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: fieldRules.REQUIRED_MESSAGE,
        });
      }
    });
  });

/**
 * Employee Schema - Full validation for create operations
 */
export const employeeSchema = withEmploymentRules(employeeBaseSchema);

/**
 * Update Employee Schema - Partial validation for update operations
 */
export const updateEmployeeSchema = withEmploymentRules(employeeBaseSchema.partial());

/**
 * Validation helper for frontend
 */
export const validateEmployeeData = (data) => {
  const result = employeeSchema.safeParse(data);

  if (result.success) {
    return { success: true, errors: {} };
  }

  const errors = {};
  const issues = result.error.issues || result.error.errors || [];

  issues.forEach((issue) => {
    const field = issue.path[0];
    // Keep the first error per field so the form shows one message per input.
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  });

  return { success: false, errors };
};
