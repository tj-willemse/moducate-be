/**
 * Trigger function that runs when an assessment is updated
 */

const functions = require('firebase-functions');
const { admin } = require('../config/firebase');
const { getDocById } = require('../utils/db');

/**
 * When an assessment document is updated in Firestore,
 * log the changes and notify relevant users
 */
const onAssessmentUpdated = functions.firestore
  .onDocumentUpdated('assessments/{assessmentId}', async (event) => {
    const change = {
      before: event.data.before,
      after: event.data.after
    };
    const context = event;
    try {
      const assessmentId = context.params.assessmentId;
      const beforeData = change.before.data();
      const afterData = change.after.data();
      
      // Check if status has changed
      if (beforeData.status !== afterData.status) {
        console.log(`Assessment status changed for ${assessmentId}: ${beforeData.status} -> ${afterData.status}`);
        
        // Notify lecturer about status change
        if (afterData.lecturerId) {
          try {
            const lecturer = await getDocById('users', afterData.lecturerId);
            console.log(`Notifying lecturer ${lecturer.displayName} about assessment status change`);
            
            // Here you could add notification logic:
            // - Send email to lecturer
            // - Create notification in Firestore
            // - Send push notification
            
          } catch (error) {
            console.error(`Error getting lecturer info: ${error.message}`);
          }
        }
        
        // Log moderator who made the change if available
        if (afterData.moderatorId && beforeData.moderatorId !== afterData.moderatorId) {
          try {
            const moderator = await getDocById('users', afterData.moderatorId);
            console.log(`Assessment moderated by: ${moderator.displayName}`);
          } catch (error) {
            console.error(`Error getting moderator info: ${error.message}`);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error in onAssessmentUpdated trigger:', error);
      return null;
    }
  });

module.exports = onAssessmentUpdated;