/**
 * Re-export of the workspace-level shared employee schema.
 *
 * This previously held a divergent copy of the schema. It now re-exports the
 * canonical one so frontend and backend validate against identical rules.
 */

export * from '../../../shared/schemas/employee.schema.js';
