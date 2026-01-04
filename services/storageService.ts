import { Soundscape } from '../types';
import { supabase } from './supabaseClient';

const DB_NAME = 'RealitySelectionDB';
const DB_VERSION = 2; // Upgraded for Store Splitting
const STORE_META = 'soundscapes';
const STORE_AUDIO = 'soundscapes_audio';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store 1: Metadata (Lightweight)
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }

      // Store 2: Binary Audio Data (Heavy)
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const storageService = {
  // Returns List of Soundscapes WITHOUT the heavy audioBase64 string
  async getAllSoundscapes(): Promise<Soundscape[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_META, 'readonly');
      const store = transaction.objectStore(STORE_META);
      const request = store.getAll();

      request.onsuccess = () => {
        // Ensure we return objects that adhere to the interface, even if audio is missing
        const results: Soundscape[] = (request.result || []).map((item: any) => ({
          ...item,
          audioBase64: '' // Explicitly empty to save memory
        }));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Just-In-Time Fetch for Audio
  async getSoundscapeAudio(id: string): Promise<string | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_AUDIO, 'readonly');
      const store = transaction.objectStore(STORE_AUDIO);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.audioBase64);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => {
        console.error("Audio fetch error", request.error);
        resolve(null);
      };
    });
  },

  async saveSoundscape(soundscape: Soundscape): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_META, STORE_AUDIO], 'readwrite');

      const metaStore = transaction.objectStore(STORE_META);
      const audioStore = transaction.objectStore(STORE_AUDIO);

      // Split the object
      const { audioBase64, ...metaOnly } = soundscape;
      const audioOnly = { id: soundscape.id, audioBase64: audioBase64 };

      const req1 = metaStore.put(metaOnly);
      const req2 = audioStore.put(audioOnly);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },
  async deleteSoundscape(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_META, STORE_AUDIO], 'readwrite');

      transaction.objectStore(STORE_META).delete(id);
      transaction.objectStore(STORE_AUDIO).delete(id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  // --- Supabase Persistence ---
  async syncProfile(userId: string, data: any) {
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      ...data,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data;
  },

  async logSession(log: any) {
    const { error } = await supabase.from('session_logs').insert(log);
    if (error) throw error;
  },

  async uploadSessionAudio(userId: string, sessionId: string, audioBlob: Blob): Promise<string | null> {
    const fileName = `${userId}/${sessionId}.wav`;
    const { data, error } = await supabase.storage
      .from('meditations')
      .upload(fileName, audioBlob, {
        contentType: 'audio/wav',
        upsert: true
      });

    if (error) {
      console.error("Storage upload failed", error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from('meditations').getPublicUrl(fileName);
    console.log("💾 Audio uploaded to:", publicUrl);
    return publicUrl;
  },

  async uploadSessionAudio(userId: string, sessionId: string, audioBlob: Blob): Promise<string | null> {
    const fileName = `${userId}/${sessionId}.wav`;
    const { data, error } = await supabase.storage
      .from('meditations')
      .upload(fileName, audioBlob, {
        contentType: 'audio/wav',
        upsert: true
      });

    if (error) {
      console.error("Storage upload failed", error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from('meditations').getPublicUrl(fileName);
    console.log("💾 Audio uploaded to:", publicUrl);
    return publicUrl;
  },

  async getSessionLogs(userId: string) {
    const { data, error } = await supabase.from('session_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async savePart(part: any) {
    const { error } = await supabase.from('parts_ledger').upsert(part);
    if (error) throw error;
  },

  async getParts(userId: string) {
    const { data, error } = await supabase.from('parts_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('last_accessed', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async saveSomaticAnchor(anchor: any) {
    const { error } = await supabase.from('somatic_anchors').upsert(anchor);
    if (error) throw error;
  },

  async getSomaticAnchors(userId: string) {
    const { data, error } = await supabase.from('somatic_anchors')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
