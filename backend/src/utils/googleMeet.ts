import axios from 'axios';

interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string;
  count?: number;
}

interface CreateMeetingData {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allowedParticipants: string[];
  teacherEmail: string;
}

interface CreateRecurringMeetingData extends CreateMeetingData {
  recurrenceRule: RecurrenceRule;
}

interface UpdateMeetingData {
  eventId: string;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  allowedParticipants?: string[];
  teacherEmail?: string;
}

interface GoogleMeetResponse {
  success: boolean;
  message: string;
  data: {
    eventId: string;
    meetLink: string;
    hangoutLink?: string;
    conferenceId?: string;
    startTime: string;
    endTime: string;
    recurrence?: string[];
  } | null;
  timestamp: string;
}

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || '';
const GOOGLE_SCRIPT_API_KEY = process.env.GOOGLE_SCRIPT_API_KEY || 'your-secret-api-key-here';

export const googleMeetService = {
  /**
   * Create a single Google Meet meeting
   */
  createMeeting: async (data: CreateMeetingData): Promise<GoogleMeetResponse> => {
    try {
      const response = await axios.post(GOOGLE_SCRIPT_URL, {
        apiKey: GOOGLE_SCRIPT_API_KEY,
        action: 'createMeeting',
        ...data
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating Google Meet:', error.message);
      throw new Error('Failed to create Google Meet: ' + error.message);
    }
  },

  /**
   * Create a recurring Google Meet meeting
   */
  createRecurringMeeting: async (data: CreateRecurringMeetingData): Promise<GoogleMeetResponse> => {
    try {
      const response = await axios.post(GOOGLE_SCRIPT_URL, {
        apiKey: GOOGLE_SCRIPT_API_KEY,
        action: 'createRecurringMeeting',
        ...data
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating recurring Google Meet:', error.message);
      throw new Error('Failed to create recurring Google Meet: ' + error.message);
    }
  },

  /**
   * Update an existing Google Meet meeting
   */
  updateMeeting: async (data: UpdateMeetingData): Promise<GoogleMeetResponse> => {
    try {
      const response = await axios.post(GOOGLE_SCRIPT_URL, {
        apiKey: GOOGLE_SCRIPT_API_KEY,
        action: 'updateMeeting',
        ...data
      });
      return response.data;
    } catch (error: any) {
      console.error('Error updating Google Meet:', error.message);
      throw new Error('Failed to update Google Meet: ' + error.message);
    }
  },

  /**
   * Delete a Google Meet meeting
   */
  deleteMeeting: async (eventId: string): Promise<GoogleMeetResponse> => {
    try {
      const response = await axios.post(GOOGLE_SCRIPT_URL, {
        apiKey: GOOGLE_SCRIPT_API_KEY,
        action: 'deleteMeeting',
        eventId
      });
      return response.data;
    } catch (error: any) {
      console.error('Error deleting Google Meet:', error.message);
      throw new Error('Failed to delete Google Meet: ' + error.message);
    }
  },

  /**
   * Get Google Meet meeting details
   */
  getMeetingDetails: async (eventId: string): Promise<GoogleMeetResponse> => {
    try {
      const response = await axios.post(GOOGLE_SCRIPT_URL, {
        apiKey: GOOGLE_SCRIPT_API_KEY,
        action: 'getMeetingDetails',
        eventId
      });
      return response.data;
    } catch (error: any) {
      console.error('Error getting Google Meet details:', error.message);
      throw new Error('Failed to get Google Meet details: ' + error.message);
    }
  }
};
