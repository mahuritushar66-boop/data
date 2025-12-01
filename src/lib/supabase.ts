// Supabase configuration for file storage (PDFs, images for theory questions)
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// Only create the client if both URL and key are provided
let supabase: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (!supabase && isSupabaseConfigured()) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  if (!supabase) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }
  return supabase;
};

// Upload file to Supabase Storage
export const uploadToSupabase = async (
  file: File,
  bucket: string = 'theory-questions',
  folder: string = 'uploads'
): Promise<string> => {
  const client = getSupabaseClient();

  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await client.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = client.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};

// Delete file from Supabase Storage
export const deleteFromSupabase = async (
  fileUrl: string,
  bucket: string = 'theory-questions'
): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  const client = getSupabaseClient();

  // Extract file path from URL
  const urlParts = fileUrl.split(`${bucket}/`);
  if (urlParts.length < 2) return;
  
  const filePath = urlParts[1];

  const { error } = await client.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error('Supabase delete error:', error);
  }
};

export const getSupabaseConfig = () => ({
  url: SUPABASE_URL,
  isConfigured: isSupabaseConfigured(),
});

