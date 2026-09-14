import { supabase } from '../lib/supabase';

export interface PigFile {
  id: string;
  farm_id: string;
  pig_id: string;
  uploaded_by: string;
  bucket_name: string;
  object_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

const BUCKET_NAME = 'farm-files';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export async function listPigFiles(pigId: string): Promise<PigFile[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('pig_files')
    .select('id, farm_id, pig_id, uploaded_by, bucket_name, object_path, file_name, mime_type, file_size, created_at')
    .eq('pig_id', pigId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as PigFile[];
}

export async function uploadPigFile(file: File, pigId: string, farmId: string): Promise<PigFile> {
  if (!supabase) throw new Error('File storage requires Supabase to be configured.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Files must be 10 MB or smaller.');
  if (!ALLOWED_FILE_TYPES.has(file.type)) throw new Error('Only JPG, PNG, WEBP, and PDF files are supported.');

  const objectPath = `${farmId}/pigs/${pigId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Your session has expired. Please sign in again.');

  const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(objectPath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error: metadataError } = await supabase
    .from('pig_files')
    .insert({
      farm_id: farmId,
      pig_id: pigId,
      uploaded_by: authData.user.id,
      bucket_name: BUCKET_NAME,
      object_path: objectPath,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
    })
    .select('id, farm_id, pig_id, uploaded_by, bucket_name, object_path, file_name, mime_type, file_size, created_at')
    .single();

  if (metadataError) {
    await supabase.storage.from(BUCKET_NAME).remove([objectPath]);
    throw new Error(metadataError.message);
  }

  return data as PigFile;
}

export async function createPigFileUrl(file: PigFile): Promise<string> {
  if (!supabase) throw new Error('File storage requires Supabase to be configured.');
  const { data, error } = await supabase.storage.from(file.bucket_name).createSignedUrl(file.object_path, 60 * 10);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Unable to create a secure file link.');
  return data.signedUrl;
}

export { MAX_FILE_SIZE };
