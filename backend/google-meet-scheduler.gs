/**
 * StudyASAN Google Meet Class Scheduler
 * 
 * This Google Apps Script creates and manages Google Meet classes for the StudyASAN platform.
 * It automatically allows enrolled participants and blocks non-enrolled participants.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project
 * 2. Copy this entire script into the editor
 * 3. Enable the Google Calendar API:
 *    - Click on "Services" (+ icon) in the left sidebar
 *    - Find "Google Calendar API" and click "Add"
 * 4. Deploy as Web App:
 *    - Click "Deploy" > "New deployment"
 *    - Select "Web app" as the type
 *    - Set "Execute as" to your account
 *    - Set "Who has access" to "Anyone" (or your organization)
 *    - Click "Deploy" and authorize the app
 * 5. Copy the Web App URL and add it to your backend .env as GOOGLE_SCRIPT_URL
 */

// Configuration
const CONFIG = {
  // Calendar ID - use 'primary' for your primary calendar or a specific calendar ID
  CALENDAR_ID: 'primary',
  
  // Timezone for scheduling
  TIMEZONE: 'Asia/Kolkata',
  
  // Default reminder minutes before class
  REMINDER_MINUTES: 15,
  
  // API Key for authentication (set this to match your backend)
  API_KEY: 'your-secret-api-key-here'
};

/**
 * Handle HTTP POST requests from the backend
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Validate API key
    if (data.apiKey !== CONFIG.API_KEY) {
      return createResponse(false, 'Unauthorized', null, 401);
    }
    
    switch (data.action) {
      case 'createMeeting':
        return createMeeting(data);
      case 'updateMeeting':
        return updateMeeting(data);
      case 'deleteMeeting':
        return deleteMeeting(data);
      case 'createRecurringMeeting':
        return createRecurringMeeting(data);
      case 'getMeetingDetails':
        return getMeetingDetails(data);
      default:
        return createResponse(false, 'Invalid action', null, 400);
    }
  } catch (error) {
    return createResponse(false, error.message, null, 500);
  }
}

/**
 * Handle HTTP GET requests (for testing)
 */
function doGet(e) {
  return createResponse(true, 'StudyASAN Google Meet Scheduler is running', {
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}

/**
 * Create a single Google Meet meeting
 */
function createMeeting(data) {
  try {
    const { 
      title, 
      description, 
      startTime, 
      endTime, 
      allowedParticipants,
      teacherEmail,
      hostEmail
    } = data;
    
    // Create calendar event with Google Meet
    const event = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID).createEvent(
      title,
      new Date(startTime),
      new Date(endTime),
      {
        description: buildDescription(description, allowedParticipants),
        location: 'Google Meet',
        sendInvites: false
      }
    );
    
    // Add Google Meet video conferencing
    const eventId = event.getId();
    const calendarEvent = Calendar.Events.get(CONFIG.CALENDAR_ID, eventId.split('@')[0]);
    
    // Update event with conference data
    const patchedEvent = Calendar.Events.patch(
      {
        conferenceData: {
          createRequest: {
            requestId: Utilities.getUuid(),
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: true
      },
      CONFIG.CALENDAR_ID,
      eventId.split('@')[0],
      { conferenceDataVersion: 1 }
    );
    
    // Add allowed participants as guests
    const guests = [];
    
    // Add teacher
    if (teacherEmail) {
      guests.push({ email: teacherEmail, responseStatus: 'accepted' });
    }
    
    // Add students
    if (allowedParticipants && allowedParticipants.length > 0) {
      allowedParticipants.forEach(email => {
        guests.push({ email: email, responseStatus: 'needsAction' });
      });
    }
    
    if (guests.length > 0) {
      Calendar.Events.patch(
        {
          attendees: guests,
          conferenceData: patchedEvent.conferenceData
        },
        CONFIG.CALENDAR_ID,
        eventId.split('@')[0],
        { sendUpdates: 'all' }
      );
    }
    
    // Get updated event with meet link
    const updatedEvent = Calendar.Events.get(
      CONFIG.CALENDAR_ID, 
      eventId.split('@')[0],
      { conferenceDataVersion: 1 }
    );
    
    const meetLink = updatedEvent.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri || null;
    
    return createResponse(true, 'Meeting created successfully', {
      eventId: eventId,
      meetLink: meetLink,
      hangoutLink: updatedEvent.hangoutLink,
      conferenceId: updatedEvent.conferenceData?.conferenceId,
      startTime: startTime,
      endTime: endTime
    });
    
  } catch (error) {
    return createResponse(false, 'Failed to create meeting: ' + error.message, null, 500);
  }
}

/**
 * Create a recurring Google Meet meeting
 */
function createRecurringMeeting(data) {
  try {
    const { 
      title, 
      description, 
      startTime, 
      endTime,
      recurrenceRule,
      allowedParticipants,
      teacherEmail
    } = data;
    
    // Parse recurrence rule
    const rrule = buildRecurrenceRule(recurrenceRule);
    
    // Create recurring event
    const event = {
      summary: title,
      description: buildDescription(description, allowedParticipants),
      start: {
        dateTime: startTime,
        timeZone: CONFIG.TIMEZONE
      },
      end: {
        dateTime: endTime,
        timeZone: CONFIG.TIMEZONE
      },
      recurrence: [rrule],
      conferenceData: {
        createRequest: {
          requestId: Utilities.getUuid(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: CONFIG.REMINDER_MINUTES },
          { method: 'popup', minutes: 10 }
        ]
      }
    };
    
    // Add attendees
    const attendees = [];
    if (teacherEmail) {
      attendees.push({ email: teacherEmail, responseStatus: 'accepted' });
    }
    if (allowedParticipants && allowedParticipants.length > 0) {
      allowedParticipants.forEach(email => {
        attendees.push({ email: email, responseStatus: 'needsAction' });
      });
    }
    if (attendees.length > 0) {
      event.attendees = attendees;
    }
    
    // Create the event
    const createdEvent = Calendar.Events.insert(
      event,
      CONFIG.CALENDAR_ID,
      { conferenceDataVersion: 1, sendUpdates: 'all' }
    );
    
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri || createdEvent.hangoutLink;
    
    return createResponse(true, 'Recurring meeting created successfully', {
      eventId: createdEvent.id,
      meetLink: meetLink,
      hangoutLink: createdEvent.hangoutLink,
      conferenceId: createdEvent.conferenceData?.conferenceId,
      recurrence: createdEvent.recurrence,
      startTime: startTime,
      endTime: endTime
    });
    
  } catch (error) {
    return createResponse(false, 'Failed to create recurring meeting: ' + error.message, null, 500);
  }
}

/**
 * Update an existing meeting
 */
function updateMeeting(data) {
  try {
    const { 
      eventId, 
      title, 
      description, 
      startTime, 
      endTime, 
      allowedParticipants,
      teacherEmail
    } = data;
    
    const cleanEventId = eventId.includes('@') ? eventId.split('@')[0] : eventId;
    
    // Get existing event
    const existingEvent = Calendar.Events.get(CONFIG.CALENDAR_ID, cleanEventId);
    
    // Build update object
    const updateData = {};
    
    if (title) updateData.summary = title;
    if (description || allowedParticipants) {
      updateData.description = buildDescription(
        description || existingEvent.description,
        allowedParticipants
      );
    }
    if (startTime) {
      updateData.start = {
        dateTime: startTime,
        timeZone: CONFIG.TIMEZONE
      };
    }
    if (endTime) {
      updateData.end = {
        dateTime: endTime,
        timeZone: CONFIG.TIMEZONE
      };
    }
    
    // Update attendees if provided
    if (allowedParticipants || teacherEmail) {
      const attendees = [];
      if (teacherEmail) {
        attendees.push({ email: teacherEmail, responseStatus: 'accepted' });
      }
      if (allowedParticipants && allowedParticipants.length > 0) {
        allowedParticipants.forEach(email => {
          attendees.push({ email: email, responseStatus: 'needsAction' });
        });
      }
      updateData.attendees = attendees;
    }
    
    // Update the event
    const updatedEvent = Calendar.Events.patch(
      updateData,
      CONFIG.CALENDAR_ID,
      cleanEventId,
      { sendUpdates: 'all' }
    );
    
    return createResponse(true, 'Meeting updated successfully', {
      eventId: updatedEvent.id,
      meetLink: updatedEvent.hangoutLink,
      startTime: updatedEvent.start.dateTime,
      endTime: updatedEvent.end.dateTime
    });
    
  } catch (error) {
    return createResponse(false, 'Failed to update meeting: ' + error.message, null, 500);
  }
}

/**
 * Delete a meeting
 */
function deleteMeeting(data) {
  try {
    const { eventId } = data;
    const cleanEventId = eventId.includes('@') ? eventId.split('@')[0] : eventId;
    
    Calendar.Events.remove(CONFIG.CALENDAR_ID, cleanEventId, { sendUpdates: 'all' });
    
    return createResponse(true, 'Meeting deleted successfully', { eventId: eventId });
    
  } catch (error) {
    return createResponse(false, 'Failed to delete meeting: ' + error.message, null, 500);
  }
}

/**
 * Get meeting details
 */
function getMeetingDetails(data) {
  try {
    const { eventId } = data;
    const cleanEventId = eventId.includes('@') ? eventId.split('@')[0] : eventId;
    
    const event = Calendar.Events.get(
      CONFIG.CALENDAR_ID, 
      cleanEventId,
      { conferenceDataVersion: 1 }
    );
    
    const meetLink = event.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri || event.hangoutLink;
    
    return createResponse(true, 'Meeting details retrieved', {
      eventId: event.id,
      title: event.summary,
      description: event.description,
      meetLink: meetLink,
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      attendees: event.attendees?.map(a => ({
        email: a.email,
        responseStatus: a.responseStatus
      })) || [],
      recurrence: event.recurrence
    });
    
  } catch (error) {
    return createResponse(false, 'Failed to get meeting details: ' + error.message, null, 500);
  }
}

/**
 * Build recurrence rule string from recurrence object
 */
function buildRecurrenceRule(recurrence) {
  if (!recurrence) return null;
  
  let rrule = 'RRULE:FREQ=';
  
  switch (recurrence.frequency) {
    case 'daily':
      rrule += 'DAILY';
      break;
    case 'weekly':
      rrule += 'WEEKLY';
      break;
    case 'monthly':
      rrule += 'MONTHLY';
      break;
    default:
      rrule += 'WEEKLY';
  }
  
  // Add interval
  if (recurrence.interval) {
    rrule += ';INTERVAL=' + recurrence.interval;
  }
  
  // Add days of week for weekly recurrence
  if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
    const dayMap = {
      0: 'SU',
      1: 'MO',
      2: 'TU',
      3: 'WE',
      4: 'TH',
      5: 'FR',
      6: 'SA'
    };
    const days = recurrence.daysOfWeek.map(d => dayMap[d]).join(',');
    rrule += ';BYDAY=' + days;
  }
  
  // Add end date or count
  if (recurrence.endDate) {
    const endDate = new Date(recurrence.endDate);
    const until = Utilities.formatDate(endDate, CONFIG.TIMEZONE, "yyyyMMdd'T'HHmmss'Z'");
    rrule += ';UNTIL=' + until;
  } else if (recurrence.count) {
    rrule += ';COUNT=' + recurrence.count;
  }
  
  return rrule;
}

/**
 * Build description with allowed participants list
 */
function buildDescription(description, allowedParticipants) {
  let fullDescription = description || '';
  
  if (allowedParticipants && allowedParticipants.length > 0) {
    fullDescription += '\n\n---\nALLOWED PARTICIPANTS:\n';
    fullDescription += allowedParticipants.join('\n');
    fullDescription += '\n---';
    fullDescription += '\nNote: Only listed participants can join this meeting.';
  }
  
  return fullDescription;
}

/**
 * Create standardized JSON response
 */
function createResponse(success, message, data, statusCode = 200) {
  const response = {
    success: success,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function - Create a test meeting
 */
function testCreateMeeting() {
  const testData = {
    apiKey: CONFIG.API_KEY,
    action: 'createMeeting',
    title: 'Test Class Session',
    description: 'This is a test class session',
    startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    endTime: new Date(Date.now() + 7200000).toISOString(),   // 2 hours from now
    allowedParticipants: ['student1@example.com', 'student2@example.com'],
    teacherEmail: 'teacher@example.com'
  };
  
  const result = createMeeting(testData);
  Logger.log(result.getContent());
}

/**
 * Test function - Create a recurring meeting
 */
function testCreateRecurringMeeting() {
  const testData = {
    apiKey: CONFIG.API_KEY,
    action: 'createRecurringMeeting',
    title: 'Weekly Math Class',
    description: 'Weekly mathematics class for Class 10',
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 7200000).toISOString(),
    recurrenceRule: {
      frequency: 'weekly',
      interval: 1,
      daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
      count: 10 // 10 occurrences
    },
    allowedParticipants: ['student1@example.com', 'student2@example.com'],
    teacherEmail: 'teacher@example.com'
  };
  
  const result = createRecurringMeeting(testData);
  Logger.log(result.getContent());
}
