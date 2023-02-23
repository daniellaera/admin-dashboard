import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey: string = process.env.SUPABASE_SERVICE_ROLE!;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);