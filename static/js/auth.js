/**
 * Authentication Module - Supabase Auth
 * 
 * Handles:
 * - Supabase client initialization with retry logic
 * - Google OAuth authentication
 * - Email/Password authentication
 * - Session persistence
 * - Error handling and user feedback
 */

(function () {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 500; // ms
  const SUPABASE_CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get Supabase configuration from window or localStorage
   */
  function getSupabaseConfig() {
    const url = window.SUPABASE_URL || localStorage.getItem('sb_url') || '';
    const key = window.SUPABASE_ANON_KEY || window.SUPABASE_KEY || localStorage.getItem('sb_key') || '';
    return { url, key };
  }

  /**
   * Show status message to user
   */
  function showStatus(message, isError = false) {
    const statusEl = document.getElementById('status') || document.getElementById('authStatus');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.color = isError ? '#ef4444' : '#2b7de9';
    }
    console.log(`[Auth] ${message}`);
  }

  /**
   * Clear status message
   */
  function clearStatus() {
    const statusEl = document.getElementById('status') || document.getElementById('authStatus');
    if (statusEl) {
      statusEl.textContent = '';
    }
  }

  /**
   * Retry function with exponential backoff
   */
  async function retryWithBackoff(fn, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    throw lastError;
  }

  // ============================================================================
  // SUPABASE CLIENT INITIALIZATION
  // ============================================================================

  /**
   * Load Supabase UMD script
   */
  function loadSupabaseScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.supabase) {
        resolve();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(`script[src="${SUPABASE_CDN_URL}"]`);
      if (existingScript) {
        // Wait for it to load
        existingScript.addEventListener('load', resolve);
        existingScript.addEventListener('error', reject);
        return;
      }

      // Create and load script
      const script = document.createElement('script');
      script.src = SUPABASE_CDN_URL;
      script.onload = () => {
        // Wait for supabase to be available
        let tries = 0;
        const checkSupabase = () => {
          if (window.supabase) {
            resolve();
          } else if (tries < 10) {
            tries++;
            setTimeout(checkSupabase, 100);
          } else {
            reject(new Error('Supabase UMD failed to initialize'));
          }
        };
        checkSupabase();
      };
      script.onerror = () => reject(new Error('Failed to load Supabase script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Supabase client with retry logic
   */
  async function initSupabaseClient() {
    const config = getSupabaseConfig();

    if (!config.url || !config.key) {
      const errorMsg = 'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY.';
      showStatus(errorMsg, true);
      console.warn('[Auth]', errorMsg);
      return null;
    }

    try {
      // Load Supabase script with retry
      await retryWithBackoff(() => loadSupabaseScript());

      if (!window.supabase) {
        throw new Error('Supabase library not available after loading');
      }

      // Create client
      const client = window.supabase.createClient(config.url, config.key);
      
      // Store globally for dashboard use
      window.__supabase = client;

      console.log('[Auth] Supabase client initialized successfully');
      return client;
    } catch (error) {
      const errorMsg = `Failed to initialize Supabase: ${error.message}`;
      showStatus(errorMsg, true);
      console.error('[Auth]', error);
      return null;
    }
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Persist session to backend
   */
  async function persistSession(session) {
    if (!session) {
      console.warn('[Auth] No session provided for persistence');
      return false;
    }

    const accessToken = session.access_token || session.accessToken || session.provider_token;
    if (!accessToken) {
      console.warn('[Auth] No access token in session');
      return false;
    }

    try {
      const response = await fetch('/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });

      if (!response.ok) {
        throw new Error(`Session persistence failed: ${response.status}`);
      }

      console.log('[Auth] Session persisted successfully');
      return true;
    } catch (error) {
      console.warn('[Auth] Session persistence error:', error);
      // Don't show error to user - session might still work
      return false;
    }
  }

  /**
   * Check existing session and redirect if authenticated
   */
  async function checkExistingSession(client) {
    if (!client) return false;

    try {
      const { data, error } = await client.auth.getSession();
      
      if (error) {
        console.warn('[Auth] Session check error:', error);
        return false;
      }

      const session = data?.session;
      if (session) {
        await persistSession(session);
        
        // Only redirect if we're on auth page
        if (window.location.pathname === '/auth' || window.location.pathname.includes('/auth')) {
          window.location.href = '/dashboard';
        }
        return true;
      }

      return false;
    } catch (error) {
      console.warn('[Auth] Session check failed:', error);
      return false;
    }
  }

  // ============================================================================
  // AUTHENTICATION HANDLERS
  // ============================================================================

  /**
   * Handle Google OAuth sign-in
   */
  async function handleGoogleSignIn(client) {
    if (!client) {
      showStatus('Authentication service not available', true);
      return;
    }

    try {
      clearStatus();
      showStatus('Redirecting to Google...');

      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth',
        },
      });

      if (error) {
        throw error;
      }

      // OAuth will redirect, so we won't reach here
    } catch (error) {
      const errorMsg = error.message || 'Google sign-in failed. Please try again.';
      showStatus(errorMsg, true);
      console.error('[Auth] Google sign-in error:', error);
    }
  }

  /**
   * Handle email/password sign-in
   */
  async function handleEmailPasswordSignIn(client, email, password) {
    if (!client) {
      showStatus('Authentication service not available', true);
      return;
    }

    if (!email || !password) {
      showStatus('Please enter both email and password', true);
      return;
    }

    try {
      clearStatus();
      showStatus('Signing in...');

      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      // Get session (might need to fetch if not in response)
      let session = data?.session;
      if (!session) {
        const sessionData = await client.auth.getSession();
        session = sessionData?.data?.session;
      }

      if (session) {
        await persistSession(session);
        showStatus('Sign in successful. Redirecting...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } else {
        throw new Error('No session received after sign-in');
      }
    } catch (error) {
      const errorMsg = error.message || 'Authentication failed. Please check your credentials.';
      showStatus(errorMsg, true);
      console.error('[Auth] Email/password sign-in error:', error);
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Handle OAuth callback from URL hash
   */
  async function handleOAuthCallback(client) {
    if (!client) return false;

    // Check if we have OAuth tokens in the URL hash
    const hash = window.location.hash;
    if (!hash || (!hash.includes('access_token') && !hash.includes('error'))) {
      return false;
    }

    try {
      console.log('[Auth] Processing OAuth callback...');
      showStatus('Completing sign in...');
      
      // Check for error in hash
      if (hash.includes('error=')) {
        const errorMatch = hash.match(/error=([^&]+)/);
        const error = errorMatch ? decodeURIComponent(errorMatch[1]) : 'Authentication failed';
        console.error('[Auth] OAuth error:', error);
        showStatus(`Authentication failed: ${error}`, true);
        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname);
        return false;
      }

      // Supabase automatically parses the hash when getSession() is called
      // Wait a bit for Supabase to process the hash
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data, error } = await client.auth.getSession();
      
      if (error) {
        console.error('[Auth] OAuth callback error:', error);
        showStatus('Authentication failed. Please try again.', true);
        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname);
        return false;
      }

      const session = data?.session;
      if (session) {
        console.log('[Auth] OAuth callback successful');
        await persistSession(session);
        
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
        
        // Redirect to dashboard
        showStatus('Sign in successful. Redirecting...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
        return true;
      }

      // If no session but hash exists, wait a bit more and try again
      if (hash.includes('access_token')) {
        console.log('[Auth] Waiting for session to be established...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryData = await client.auth.getSession();
        if (retryData?.data?.session) {
          await persistSession(retryData.data.session);
          window.history.replaceState(null, '', window.location.pathname);
          showStatus('Sign in successful. Redirecting...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 500);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[Auth] OAuth callback processing error:', error);
      showStatus('Authentication error. Please try again.', true);
      // Clear the hash
      window.history.replaceState(null, '', window.location.pathname);
      return false;
    }
  }

  /**
   * Initialize authentication module
   */
  async function initAuth() {
    console.log('[Auth] Initializing authentication module...');

    // Get configuration
    const config = getSupabaseConfig();
    if (!config.url || !config.key) {
      showStatus('Authentication not configured', true);
      return;
    }

    // Initialize Supabase client
    const client = await initSupabaseClient();
    if (!client) {
      return;
    }

    // Handle OAuth callback first (if tokens are in URL hash)
    const isOAuthCallback = await handleOAuthCallback(client);
    if (isOAuthCallback) {
      return; // OAuth callback handled, don't continue with normal flow
    }

    // Check for existing session
    await checkExistingSession(client);

    // Set up auth state change listener
    client.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state changed:', event);

      if (event === 'SIGNED_IN' && session) {
        await persistSession(session);
        
        // Redirect to dashboard if on auth page
        if (window.location.pathname === '/auth' || window.location.pathname.includes('/auth')) {
          window.location.href = '/dashboard';
        }
      } else if (event === 'SIGNED_OUT') {
        // Clear any local state if needed
        console.log('[Auth] User signed out');
      }
    });

    // Set up UI handlers
    const googleBtn = document.getElementById('googleBtn') || 
                      document.getElementById('google-login-btn');
    const emailForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Google OAuth button
    if (googleBtn) {
      googleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleGoogleSignIn(client);
      });
    }

    // Email/Password form
    if (emailForm) {
      emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput?.value || '';
        const password = passwordInput?.value || '';
        await handleEmailPasswordSignIn(client, email, password);
      });
    }

    console.log('[Auth] Authentication module initialized');
  }

  // ============================================================================
  // START INITIALIZATION
  // ============================================================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }
})();
