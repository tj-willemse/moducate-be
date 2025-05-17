/**
 * Trigger function that runs when a new assessment is created
 */

const functions = require('firebase-functions');
const { admin } = require('../config/firebase');
const { getDocById } = require('../utils/db');

/**
 * When a new assessment document is created in Firestore,
 * log the event and notify moderators if needed
 */
const onNewAssessment = functions.firestore
  .onDocumentCreated('assessments/{assessmentId}', async (event) => {
    const snapshot = event.data;
    const context = event;
    try {
      const assessmentId = context.params.assessmentId;
      const assessmentData = snapshot.data();
      
      console.log(`New assessment created: ${assessmentId}`, assessmentData);
      
      // Get lecturer information
      if (assessmentData.lecturerId) {
        try {
          const lecturer = await getDocById('users', assessmentData.lecturerId);
          console.log(`Assessment created by lecturer: ${lecturer.displayName}`);
          
          // Here you could add additional logic like:
          // - Notifying moderators about new assessments
          // - Updating statistics
          // - Sending emails
          
        } catch (error) {
          console.error(`Error getting lecturer info: ${error.message}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error in onNewAssessment trigger:', error);
      return null;
    }
  });

module.exports = onNewAssessment;