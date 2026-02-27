import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Note, Upload, NoteWithUploads } from '../types/database';
import * as FileSystem from 'expo-file-system/legacy';

interface NoteState {
  notes: NoteWithUploads[];
  currentNote: NoteWithUploads | null;
  isLoading: boolean;
  isSaving: boolean;
  
  // Actions
  fetchNotes: (userId: string, classId?: string) => Promise<void>;
  fetchNotesByDate: (userId: string, date: string) => Promise<NoteWithUploads[]>;
  createNote: (noteData: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'is_synthesized'>) => Promise<Note>;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  setCurrentNote: (note: NoteWithUploads | null) => void;
  
  // File uploads
  uploadFile: (noteId: string | null, classId: string, userId: string, sessionDate: string, fileUri: string, fileName: string) => Promise<Upload>;
  deleteUpload: (uploadId: string, filePath: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  currentNote: null,
  isLoading: false,
  isSaving: false,

  fetchNotes: async (userId: string, classId?: string) => {
    try {
      set({ isLoading: true });
      
      let query = supabase
        .from('notes')
        .select(`
          *,
          uploads (*)
        `)
        .eq('user_id', userId)
        .order('session_date', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ notes: data as NoteWithUploads[], isLoading: false });
    } catch (error) {
      console.error('Fetch notes error:', error);
      set({ isLoading: false });
    }
  },

  fetchNotesByDate: async (userId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          uploads (*)
        `)
        .eq('user_id', userId)
        .eq('session_date', date);

      if (error) throw error;
      return data as NoteWithUploads[];
    } catch (error) {
      console.error('Fetch notes by date error:', error);
      return [];
    }
  },

  createNote: async (noteData) => {
    try {
      set({ isSaving: true });
      
      const { data, error } = await supabase
        .from('notes')
        .insert(noteData)
        .select()
        .single();

      if (error) throw error;

      const noteWithUploads: NoteWithUploads = { ...data, uploads: [] };
      
      set(state => ({
        notes: [noteWithUploads, ...state.notes],
        currentNote: noteWithUploads,
        isSaving: false,
      }));

      return data;
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  updateNote: async (noteId: string, updates: Partial<Note>) => {
    try {
      set({ isSaving: true });
      
      const { error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId);

      if (error) throw error;

      set(state => ({
        notes: state.notes.map(n =>
          n.id === noteId ? { ...n, ...updates } : n
        ),
        currentNote: state.currentNote?.id === noteId
          ? { ...state.currentNote, ...updates }
          : state.currentNote,
        isSaving: false,
      }));
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  deleteNote: async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      set(state => ({
        notes: state.notes.filter(n => n.id !== noteId),
        currentNote: state.currentNote?.id === noteId ? null : state.currentNote,
      }));
    } catch (error) {
      console.error('Delete note error:', error);
      throw error;
    }
  },

  setCurrentNote: (note: NoteWithUploads | null) => {
    set({ currentNote: note });
  },

  uploadFile: async (noteId, classId, userId, sessionDate, fileUri, fileName) => {
    try {
      set({ isSaving: true });

      // Read the file
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) throw new Error('File not found');

      // Generate a unique path
      const fileExt = fileName.split('.').pop();
      const filePath = `${userId}/${classId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, {
          uri: fileUri,
          type: `application/${fileExt}`,
          name: fileName,
        } as any);

      if (uploadError) throw uploadError;

      // Create upload record
      const { data, error } = await supabase
        .from('uploads')
        .insert({
          note_id: noteId,
          class_id: classId,
          user_id: userId,
          file_name: fileName,
          file_path: filePath,
          file_type: fileExt,
          file_size: fileInfo.size,
          session_date: sessionDate,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set(state => ({
        notes: state.notes.map(n =>
          n.id === noteId
            ? { ...n, uploads: [...n.uploads, data] }
            : n
        ),
        currentNote: state.currentNote?.id === noteId
          ? { ...state.currentNote, uploads: [...state.currentNote.uploads, data] }
          : state.currentNote,
        isSaving: false,
      }));

      // Trigger text extraction in the background (fire-and-forget)
      supabase.functions.invoke('extract-text', {
        body: {
          uploadId: data.id,
          filePath: filePath,
          fileType: fileExt,
        },
      }).then(({ data: extractResult, error: extractError }) => {
        if (extractError) {
          console.error('Text extraction failed:', extractError);
        } else {
          console.log('Text extracted:', extractResult?.textLength, 'chars');
        }
      }).catch((err) => {
        console.error('Text extraction invoke failed:', err);
      });

      return data;
    } catch (error) {
      set({ isSaving: false });
      throw error;
    }
  },

  deleteUpload: async (uploadId: string, filePath: string) => {
    try {
      // Delete from storage
      await supabase.storage.from('uploads').remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from('uploads')
        .delete()
        .eq('id', uploadId);

      if (error) throw error;

      set(state => ({
        notes: state.notes.map(n => ({
          ...n,
          uploads: n.uploads.filter(u => u.id !== uploadId),
        })),
        currentNote: state.currentNote
          ? {
              ...state.currentNote,
              uploads: state.currentNote.uploads.filter(u => u.id !== uploadId),
            }
          : null,
      }));
    } catch (error) {
      console.error('Delete upload error:', error);
      throw error;
    }
  },
}));


