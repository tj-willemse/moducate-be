/**
 * Assessment API endpoints
 */

const functions = require('firebase-functions');
const { admin } = require('../config/firebase');
const { getDocById, queryDocs, createDoc, updateDoc } = require('../utils/db');
const { verifyUserRole } = require('../utils/auth');

/**
 * Get all assessments with optional filters
 */
const getAssessments = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to get assessments.'
      );
    }

    // Apply filters if provided
    const conditions = [];
    if (data.status) {
      conditions.push({ field: 'status', operator: '==', value: data.status });
    }
    if (data.lecturerId) {
      conditions.push({ field: 'lecturerId', operator: '==', value: data.lecturerId });
    }
    if (data.moderatorId) {
      conditions.push({ field: 'moderatorId', operator: '==', value: data.moderatorId });
    }

    const assessments = await queryDocs('assessments', conditions);
    
    return { success: true, assessments };
  } catch (error) {
    console.error('Error getting assessments:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get assessment by ID
 */
const getAssessmentById = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to get an assessment.'
      );
    }

    const { assessmentId } = data;
    
    if (!assessmentId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Assessment ID is required.'
      );
    }

    const assessment = await getDocById('assessments', assessmentId);
    
    return { success: true, assessment };
  } catch (error) {
    console.error('Error getting assessment by ID:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Create a new assessment
 */
const createAssessment = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated and is a lecturer
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to create an assessment.'
      );
    }

    // Check if user is a lecturer
    const userId = context.auth.uid;
    const isLecturer = await verifyUserRole(userId, ['lecturer', 'admin']);
    
    if (!isLecturer) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only lecturers can create assessments.'
      );
    }

    const { title, description, content, type } = data;
    
    if (!title || !content || !type) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Title, content, and type are required.'
      );
    }

    // Create assessment document
    const assessmentData = {
      title,
      description: description || '',
      content,
      type,
      status: 'draft',
      lecturerId: userId,
      moderatorId: null,
      feedback: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await createDoc('assessments', assessmentData);
    
    return { 
      success: true, 
      message: 'Assessment created successfully',
      assessmentId: docRef.id
    };
  } catch (error) {
    console.error('Error creating assessment:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Moderate an assessment (update status and provide feedback)
 */
const moderateAssessment = functions.https.onCall(async (data, context) => {
  try {
    // Check if the user is authenticated and is a moderator
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to moderate an assessment.'
      );
    }

    // Check if user is a moderator
    const userId = context.auth.uid;
    const isModerator = await verifyUserRole(userId, ['moderator', 'admin']);
    
    if (!isModerator) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only moderators can moderate assessments.'
      );
    }

    const { assessmentId, status, feedback } = data;
    
    if (!assessmentId || !status) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Assessment ID and status are required.'
      );
    }

    // Valid statuses
    const validStatuses = ['approved', 'rejected', 'pending_changes'];
    if (!validStatuses.includes(status)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Status must be one of: ${validStatuses.join(', ')}`
      );
    }

    // Update assessment
    const updateData = {
      status,
      moderatorId: userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (feedback) {
      updateData.feedback = feedback;
    }
    
    await updateDoc('assessments', assessmentId, updateData);
    
    return { 
      success: true, 
      message: `Assessment ${status} successfully` 
    };
  } catch (error) {
    console.error('Error moderating assessment:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

module.exports = {
  getAssessments,
  getAssessmentById,
  createAssessment,
  moderateAssessment
};