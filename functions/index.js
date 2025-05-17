/**
 * Moducate Backend API
 * Firebase Cloud Functions for Assessment Moderation
 */

const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Assessments API

// Get all assessments
exports.getAssessments = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      const snapshot = await db.collection('assessments').get();
      const assessments = [];
      
      snapshot.forEach(doc => {
        assessments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      response.status(200).json(assessments);
    } catch (error) {
      logger.error('Error fetching assessments:', error);
      response.status(500).json({ error: 'Failed to fetch assessments' });
    }
  });
});

// Get assessment by ID
exports.getAssessmentById = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      const assessmentId = request.query.id;
      
      if (!assessmentId) {
        return response.status(400).json({ error: 'Assessment ID is required' });
      }
      
      const doc = await db.collection('assessments').doc(assessmentId).get();
      
      if (!doc.exists) {
        return response.status(404).json({ error: 'Assessment not found' });
      }
      
      response.status(200).json({
        id: doc.id,
        ...doc.data()
      });
    } catch (error) {
      logger.error('Error fetching assessment:', error);
      response.status(500).json({ error: 'Failed to fetch assessment' });
    }
  });
});

// Create a new assessment
exports.createAssessment = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      const { title, institution, description, criteria, dueDate } = request.body;
      
      if (!title || !institution) {
        return response.status(400).json({ error: 'Title and institution are required' });
      }
      
      const newAssessment = {
        title,
        institution,
        description: description || '',
        criteria: criteria || [],
        dueDate: dueDate || null,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('assessments').add(newAssessment);
      
      response.status(201).json({
        id: docRef.id,
        ...newAssessment
      });
    } catch (error) {
      logger.error('Error creating assessment:', error);
      response.status(500).json({ error: 'Failed to create assessment' });
    }
  });
});

// Update assessment status (for moderation)
exports.moderateAssessment = onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      const { id, status, moderationNotes, moderatedGrade } = request.body;
      
      if (!id || !status) {
        return response.status(400).json({ error: 'Assessment ID and status are required' });
      }
      
      const assessmentRef = db.collection('assessments').doc(id);
      const doc = await assessmentRef.get();
      
      if (!doc.exists) {
        return response.status(404).json({ error: 'Assessment not found' });
      }
      
      await assessmentRef.update({
        status,
        moderationNotes: moderationNotes || '',
        moderatedGrade: moderatedGrade || null,
        moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      response.status(200).json({ message: 'Assessment moderated successfully' });
    } catch (error) {
      logger.error('Error moderating assessment:', error);
      response.status(500).json({ error: 'Failed to moderate assessment' });
    }
  });
});

// Trigger when a new assessment is created
exports.onNewAssessment = onDocumentCreated('assessments/{assessmentId}', (event) => {
  const assessmentData = event.data.data();
  const assessmentId = event.params.assessmentId;
  
  logger.info(`New assessment created: ${assessmentId}`, assessmentData);
  
  // Here you could add logic to notify moderators, etc.
  return null;
});

// Trigger when an assessment is updated
exports.onAssessmentUpdated = onDocumentUpdated('assessments/{assessmentId}', (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const assessmentId = event.params.assessmentId;
  
  // Check if status changed to 'completed'
  if (beforeData.status !== 'completed' && afterData.status === 'completed') {
    logger.info(`Assessment ${assessmentId} has been completed`, afterData);
    // Here you could add logic to notify stakeholders, generate reports, etc.
  }
  
  return null;
});
