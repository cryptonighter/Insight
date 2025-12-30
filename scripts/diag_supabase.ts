
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ojbsunouimvticoqexsq.supabase.co',
    'AIzaSyCUcUZKn1w3pYmW184zkpZ3AoS9Me-t54A' // Wait, this is the Google API Key, not the Supabase key.
);

// I need the Supabase key. I'll check server/.env
