import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { usersService } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const withTimeout = (promise, ms, message) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
};

const callWithTimeoutRetry = async (fn, ms, message) => {
  try {
    return await withTimeout(fn(), ms, message);
  } catch (err) {
    const isTimeout = (err?.message || '').toLowerCase().includes('timed out');
    if (isTimeout) {
      return await withTimeout(fn(), ms, message);
    }
    throw err;
  }
};

const manualSignIn = async (email, password, ms) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured.');
  }
  const res = await withTimeout(
    fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    }),
    ms,
    'Sign-in request timed out'
  );

  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch (err) {
      detail = '';
    }
    throw new Error(`Auth error ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  const data = await res.json();
  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token
  });
  return data;
};

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastProfileFetchAtRef = useRef(0);
  const pendingProfileKey = "trustvote_pending_profile";
  const cachedProfileKey = "trustvote_cached_profile";
  const loggedOutKey = "trustvote_logged_out";
  const AUTH_TIMEOUT_MS = 30000; // Increased from 10000
  const PROFILE_RETRY_COOLDOWN_MS = 30000; // Reduced from 60000

  const fetchProfileWithRetry = async (userId) => {
    const now = Date.now();
    if (now - lastProfileFetchAtRef.current < PROFILE_RETRY_COOLDOWN_MS) {
      throw new Error('Profile lookup timed out');
    }
    lastProfileFetchAtRef.current = now;
    return callWithTimeoutRetry(
      () => usersService.getById(userId),
      AUTH_TIMEOUT_MS,
      'Profile lookup timed out'
    );
  };

  const normalizeUser = (user) => {
    if (!user) return null;
    return {
      id: user.id,
      fullName: user.full_name || user.fullName || '',
      email: user.email,
      role: user.role,
      registrationNumber: user.student_id || user.registrationNumber || '',
      department: user.department || user.student_department || '',
      year: user.year || user.academic_year || '',
      phone: user.phone || '',
      verified: user.verified ?? false,
    };
  };

  const normalizeAuthUser = (authUser) => {
    const meta = authUser?.user_metadata || {};
    return {
      id: authUser?.id,
      fullName: meta.full_name || '',
      email: authUser?.email || '',
      role: meta.role || 'student',
      registrationNumber: meta.student_id || '',
      department: meta.department || '',
      year: meta.year || '',
      phone: meta.phone || '',
      verified: !!authUser?.email_confirmed_at,
    };
  };

  const normalizeProfileWithAuth = (profile, authUser) => {
    const normalizedProfile = normalizeUser(profile);
    const normalizedAuth = normalizeAuthUser(authUser);
    return {
      ...normalizedProfile,
      role: normalizedAuth.role || normalizedProfile.role || 'student'
    };
  };

  const mergeCachedWithFallback = (cached, fallback) => {
    if (!cached) return fallback;
    return {
      ...cached,
      role: fallback?.role || cached.role || 'student'
    };
  };

  const getCachedProfile = (userId, email) => {
    try {
      const raw = localStorage.getItem(cachedProfileKey);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (cached?.id && userId && cached.id === userId) return cached;
      if (cached?.email && email && cached.email === email) return cached;
      return null;
    } catch (err) {
      return null;
    }
  };

  const setCachedProfile = (profile) => {
    if (!profile) return;
    try {
      localStorage.setItem(cachedProfileKey, JSON.stringify(profile));
    } catch (err) {
      // ignore storage errors
    }
  };

  const clearCachedProfile = () => {
    try {
      localStorage.removeItem(cachedProfileKey);
    } catch (err) {
      // ignore storage errors
    }
  };

  const clearSupabaseAuthStorage = () => {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          keys.push(key);
        }
      }
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (err) {
      // ignore storage errors
    }
  };

  useEffect(() => {
    let authSubscription;
    let isMounted = true;
    const loadingFallbackTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3000);
    const initSession = async () => {
      try {
        const { data, error } = await callWithTimeoutRetry(
          () => supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'Session check timed out'
        );
        if (error) {
          console.warn('Failed to get auth session', error);
        }
        const userId = data?.session?.user?.id;
        if (userId) {
          const authFallback = normalizeAuthUser(data?.session?.user);
          setCurrentUser(authFallback);
          try {
            const profile = await fetchProfileWithRetry(userId);
            if (profile) {
              const normalized = normalizeProfileWithAuth(profile, data?.session?.user);
              setCurrentUser(normalized);
              setCachedProfile(normalized);
            } else {
              const fallback = normalizeAuthUser(data?.session?.user);
              const cached = getCachedProfile(userId, fallback.email);
              setCurrentUser(mergeCachedWithFallback(cached, fallback));
            }
          } catch (profileErr) {
            console.warn('Profile fetch failed during session init', profileErr);
            const fallback = normalizeAuthUser(data?.session?.user);
            const cached = getCachedProfile(userId, fallback.email);
            setCurrentUser(mergeCachedWithFallback(cached, fallback));
          }
        }
      } catch (err) {
        console.warn('Auth session init failed', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const attachListener = async () => {
      try {
        const { data } = await supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user?.id) {
            const authFallback = normalizeAuthUser(session.user);
            if (isMounted) setCurrentUser(authFallback);
            try {
              const pending = localStorage.getItem(pendingProfileKey);
              if (pending) {
                const profilePayload = JSON.parse(pending);
                profilePayload.id = session.user.id;
                await usersService.upsert(profilePayload);
                localStorage.removeItem(pendingProfileKey);
              }
              let normalized;
              try {
                const profile = await fetchProfileWithRetry(session.user.id);
                if (profile) {
                  normalized = normalizeProfileWithAuth(profile, session.user);
                  setCachedProfile(normalized);
                } else {
                  const fallback = normalizeAuthUser(session.user);
                  const cached = getCachedProfile(session.user.id, fallback.email);
                  normalized = mergeCachedWithFallback(cached, fallback);
                }
              } catch (profileErr) {
                console.warn('Profile fetch failed on auth state change', profileErr);
                const fallback = normalizeAuthUser(session.user);
                const cached = getCachedProfile(session.user.id, fallback.email);
                normalized = mergeCachedWithFallback(cached, fallback);
              }
              if (isMounted) setCurrentUser(normalized);
            } catch (err) {
              console.warn('Post-confirmation profile setup failed', err);
              const fallback = normalizeAuthUser(session.user);
              const cached = getCachedProfile(session.user.id, fallback.email);
              if (isMounted) setCurrentUser(mergeCachedWithFallback(cached, fallback));
            }
          }
          if (event === 'SIGNED_OUT') {
            if (isMounted) setCurrentUser(null);
          }
        });
        authSubscription = data?.subscription;
      } catch (err) {
        console.warn('Auth state listener failed', err);
      }
    };

    initSession();
    attachListener();

    return () => {
      isMounted = false;
      clearTimeout(loadingFallbackTimeout);
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const login = async (email, password, role) => {
    setError('');
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      let data;
      let error;
      try {
        const result = await callWithTimeoutRetry(
          () => supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          }),
          AUTH_TIMEOUT_MS,
          'Sign-in request timed out'
        );
        data = result?.data;
        error = result?.error;
      } catch (err) {
        const isTimeout = (err?.message || '').toLowerCase().includes('timed out');
        if (isTimeout) {
          const fallback = await manualSignIn(normalizedEmail, password, AUTH_TIMEOUT_MS);
          data = { user: fallback?.user };
          error = null;
        } else {
          throw err;
        }
      }

      if (error || !data?.user) {
        try {
          const fallback = await manualSignIn(normalizedEmail, password, AUTH_TIMEOUT_MS);
          data = { user: fallback?.user };
          error = null;
        } catch (fallbackErr) {
          // keep original error if present
          if (!error) {
            error = fallbackErr;
          }
        }
      }
      if (error) {
        const errorMessage = error.message || 'Invalid credentials';
        if ((errorMessage || '').toLowerCase().includes('email not confirmed')) {
          setError('Email not confirmed. Please verify your email, then sign in.');
          return { ok: false, error: 'Email not confirmed. Please verify your email, then sign in.' };
        }
        setError(errorMessage);
        return { ok: false, error: errorMessage };
      }

      const userId = data?.user?.id;
      if (!userId) {
        setError('Login failed. No user id returned.');
        return { ok: false, error: 'Login failed. No user id returned.' };
      }

      const meta = data?.user?.user_metadata || {};
      let profile = null;
      try {
        profile = await fetchProfileWithRetry(userId);
      } catch (profileErr) {
        console.warn('Profile fetch failed during login', profileErr);
      }

      const effectiveRole = meta.role || profile?.role || 'student';
      if (role && role !== effectiveRole) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (signOutErr) {
          // ignore sign out errors
        }
        setError(`Role mismatch. This account is registered as ${effectiveRole}.`);
        return { ok: false, error: `Role mismatch. This account is registered as ${effectiveRole}.` };
      }

      const normalized = {
        ...normalizeAuthUser(data?.user),
        role: effectiveRole
      };

      const profilePayload = {
        id: userId,
        email: data?.user?.email || normalizedEmail,
        full_name: meta.full_name || '',
        role: effectiveRole,
        student_id: meta.student_id || null,
        department: meta.department || null,
        year: meta.year || null,
        phone: meta.phone || null,
        verified: true
      };
      setCachedProfile({
        id: userId,
        fullName: profilePayload.full_name || '',
        email: profilePayload.email || normalizedEmail,
        role: profilePayload.role,
        registrationNumber: profilePayload.student_id || '',
        department: profilePayload.department || '',
        year: profilePayload.year || '',
        phone: profilePayload.phone || '',
        verified: true
      });
      Promise.resolve(usersService.upsert(profilePayload)).catch((profileErr) => {
        console.warn('Background profile sync failed during login', profileErr);
      });

      setCurrentUser(normalized);
      return { ok: true, role: normalized.role };
    } catch (err) {
      console.error('Login failed', err);
      const message = (err?.message || '').toLowerCase().includes('timed out')
        ? 'Sign-in timed out. Check your internet and confirm the Supabase project is active.'
        : 'Login failed. Please try again.';
      setError(message);
      return { ok: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await withTimeout(
        supabase.auth.signOut(),
        AUTH_TIMEOUT_MS,
        'Logout timed out'
      );
    } catch (err) {
      console.warn('Logout failed', err);
    }
    try {
      sessionStorage.setItem(loggedOutKey, String(Date.now()));
    } catch (err) {
      // ignore storage errors
    }
    clearCachedProfile();
    clearSupabaseAuthStorage();
    try {
      localStorage.removeItem(pendingProfileKey);
    } catch (err) {
      // ignore storage errors
    }
    setCurrentUser(null);
    window.location.href = '/login';
  };

  const updateUserProfile = async (updates) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);

      const payload = {
        full_name: updatedUser.fullName,
        student_id: updatedUser.registrationNumber || null,
        department: updatedUser.department || null,
        year: updatedUser.year || null,
        phone: updatedUser.phone || null,
      };

      try {
        await usersService.update(currentUser.id, payload);
      } catch (err) {
        console.error('Failed to update user profile', err);
        setError('Failed to update profile. Please try again.');
      }
    }
  };

  const value = {
    currentUser,
    user: currentUser,
    loading,
    error,
    setError,
    login,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Sora, sans-serif',
          color: '#ffffff'
        }}>
          Loading...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
