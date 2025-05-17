/**
 * Moducate Backend API
 * Firebase Cloud Functions for Assessment Moderation
 */

// Import assessment modules
const assessmentApi = require('./assessments/api');
const assessmentOnCreate = require('./assessments/onCreate');
const assessmentOnUpdate = require('./assessments/onUpdate');

// Import user modules
const userApi = require('./users/api');
const userOnCreate = require('./users/onCreate');
const userOnUpdate = require('./users/onUpdate');

// Export all functions

// Assessment API endpoints
exports.getAssessments = assessmentApi.getAssessments;
exports.getAssessmentById = assessmentApi.getAssessmentById;
exports.createAssessment = assessmentApi.createAssessment;
exports.moderateAssessment = assessmentApi.moderateAssessment;

// Assessment triggers
exports.onNewAssessment = assessmentOnCreate;
exports.onAssessmentUpdated = assessmentOnUpdate;

// User API endpoints
exports.getUserProfile = userApi.getUserProfile;
exports.getUsers = userApi.getUsers;
exports.approveUser = userApi.approveUser;
exports.updateUserRole = userApi.updateUserRole;
exports.createFirstAdmin = userApi.createFirstAdmin;

// User triggers
exports.onUserCreate = userOnCreate;
exports.onUserUpdate = userOnUpdate;
