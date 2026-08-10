/**
 * Re-export of the workspace-level shared validation constants.
 *
 * Backend modules import shared code via '../../shared/...', while the request
 * validator and the frontend import the workspace-level 'shared/' directory.
 * Previously both locations held full copies, which silently drifted apart.
 * This file keeps the existing backend import paths working while making
 * 'shared/constants/validation.constants.js' the single source of truth.
 */

export * from '../../../shared/constants/validation.constants.js';
