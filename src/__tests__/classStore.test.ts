import { useClassStore } from '../stores/classStore';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('classStore', () => {
  beforeEach(() => {
    useClassStore.setState({
      classes: [],
      currentClass: null,
      isLoading: false,
      error: null,
    });
  });

  describe('getTodaysClasses', () => {
    it('returns classes that have a session on today\'s day of week', () => {
      const today = new Date().getDay();
      useClassStore.setState({
        classes: [
          {
            id: '1',
            user_id: 'u1',
            name: 'Math',
            description: null,
            color: null,
            location: null,
            start_date: null,
            end_date: null,
            instructor_name: null,
            instructor_email: null,
            is_active: true,
            created_at: '',
            updated_at: '',
            class_sessions: [
              {
                id: 's1',
                class_id: '1',
                day_of_week: today,
                start_time: '09:00:00',
                end_time: '10:00:00',
                location: null,
                created_at: '',
              },
            ],
          },
          {
            id: '2',
            user_id: 'u1',
            name: 'Science',
            description: null,
            color: null,
            location: null,
            start_date: null,
            end_date: null,
            instructor_name: null,
            instructor_email: null,
            is_active: true,
            created_at: '',
            updated_at: '',
            class_sessions: [
              {
                id: 's2',
                class_id: '2',
                day_of_week: (today + 1) % 7,
                start_time: '11:00:00',
                end_time: '12:00:00',
                location: null,
                created_at: '',
              },
            ],
          },
        ],
      });

      const todaysClasses = useClassStore.getState().getTodaysClasses();
      expect(todaysClasses).toHaveLength(1);
      expect(todaysClasses[0].name).toBe('Math');
    });

    it('returns empty array when no classes match today', () => {
      const today = new Date().getDay();
      useClassStore.setState({
        classes: [
          {
            id: '1',
            user_id: 'u1',
            name: 'Math',
            description: null,
            color: null,
            location: null,
            start_date: null,
            end_date: null,
            instructor_name: null,
            instructor_email: null,
            is_active: true,
            created_at: '',
            updated_at: '',
            class_sessions: [
              {
                id: 's1',
                class_id: '1',
                day_of_week: (today + 3) % 7,
                start_time: '09:00:00',
                end_time: '10:00:00',
                location: null,
                created_at: '',
              },
            ],
          },
        ],
      });

      expect(useClassStore.getState().getTodaysClasses()).toHaveLength(0);
    });
  });

  describe('setCurrentClass', () => {
    it('sets the current class', () => {
      const classData = {
        id: '1',
        user_id: 'u1',
        name: 'Math',
        description: null,
        color: null,
        location: null,
        start_date: null,
        end_date: null,
        instructor_name: null,
        instructor_email: null,
        is_active: true,
        created_at: '',
        updated_at: '',
        class_sessions: [],
      };

      useClassStore.getState().setCurrentClass(classData);
      expect(useClassStore.getState().currentClass).toEqual(classData);
    });

    it('can clear the current class', () => {
      useClassStore.getState().setCurrentClass(null);
      expect(useClassStore.getState().currentClass).toBeNull();
    });
  });
});
