import { supabase } from './supabaseClient';

const timeout = (ms) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms));

const fetchWithTimeout = async (url, options, ms) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);

    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        message: 'Supabase URL or anon key is missing in .env.'
      };
    }

    let authHealthStatus = null;
    let restStatus = null;
    try {
      const res = await fetchWithTimeout(
        `${supabaseUrl}/auth/v1/health`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`
          }
        },
        8000
      );
      authHealthStatus = res.status;
    } catch (err) {
      authHealthStatus = err?.name === 'AbortError' ? 'timeout' : 'error';
    }

    try {
      const res = await fetchWithTimeout(
        `${supabaseUrl}/rest/v1/`,
        {
          method: 'GET',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`
          }
        },
        8000
      );
      restStatus = res.status;
    } catch (err) {
      restStatus = err?.name === 'AbortError' ? 'timeout' : 'error';
    }

    try {
      const { data, error } = await Promise.race([
        supabase.from('users').select('count', { count: 'exact', head: true }),
        timeout(10000)
      ]);

      if (error) {
        return {
          success: false,
          error: error.message,
          message: 'Supabase reachable, but users table query failed.',
          details: { authHealthStatus, restStatus }
        };
      }

      return {
        success: true,
        message: 'Supabase connection successful!',
        userCount: data || 0,
        details: { authHealthStatus, restStatus }
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        message: 'Supabase reachable, but users table query timed out.',
        details: { authHealthStatus, restStatus }
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err.message,
      message: 'Unexpected error during connection test',
      details: {
        authHealthStatus: 'error',
        restStatus: 'error'
      }
    };
  }
}

export async function testTablesExist() {
  try {
    console.log('Checking if database tables exist...');

    const tables = ['users', 'positions', 'candidates', 'votes', 'announcements', 'election_settings', 'candidate_requests'];
    const results = {};

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });

      results[table] = !error;
      console.log(`  ${results[table] ? 'OK' : 'FAIL'} ${table}`);
    }

    return results;
  } catch (err) {
    console.error('Error checking tables:', err);
    return {};
  }
}

export async function listAllTables() {
  try {
    console.log('Fetching all tables from database...');

    const { data, error } = await supabase
      .rpc('get_tables');

    if (error) {
      console.log('Note: get_tables function not available. This is expected.');
      return [];
    }

    return data;
  } catch (err) {
    console.log('Could not fetch table list (this is normal for basic setups)');
    return [];
  }
}
