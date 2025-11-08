/**
 * Dashboard Module - AI Pneumonia Detection
 * 
 * Modular structure for:
 * - Navigation
 * - Unified Upload (drag-drop + file picker)
 * - Prediction with error handling
 * - History management
 * - Chat/Assistant
 * - Logout
 */

(function () {
  'use strict';

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Show toast notification
   */
  function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = 'block';
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.style.display = 'none';
      }, 280);
    }, duration);
  }

  /**
   * Handle errors consistently
   */
  function handleError(error, userMessage = 'An error occurred') {
    console.error('[Dashboard Error]', error);
    showToast(userMessage);
    return userMessage;
  }

  /**
   * Validate image file
   */
  function validateImageFile(file) {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'Please upload an image file (JPG, PNG, etc.)' };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    return { valid: true };
  }

  /**
   * Convert file to base64
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // ============================================================================
  // NAVIGATION MODULE
  // ============================================================================

  function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn[data-section]');
    const uploadSection = document.getElementById('section-upload');
    const historyList = document.getElementById('historyList');
    const chat = document.getElementById('chat');

    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const sectionKey = btn.getAttribute('data-section');
        
        // Skip if clicking Home (it navigates away)
        if (sectionKey === 'home') {
          return;
        }
        
        // Update active state for all nav buttons (desktop and mobile)
        document.querySelectorAll('.nav-btn[data-section]').forEach((b) => {
          if (b.getAttribute('data-section') === sectionKey) {
            b.classList.add('active');
            b.setAttribute('aria-pressed', 'true');
          } else {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
          }
        });

        // Scroll to relevant section (since all sections are visible)
        if (sectionKey === 'upload' && uploadSection) {
          uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (sectionKey === 'history' && historyList) {
          historyList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (sectionKey === 'assistant' && chat) {
          chat.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ============================================================================
  // UPLOAD MODULE
  // ============================================================================

  let currentFile = null;
  let currentPreviewSrc = null;

  function initUpload() {
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('preview');
    const previewContainer = document.getElementById('previewContainer');
    const uploadPlaceholder = uploadBox?.querySelector('.upload-placeholder');
    const actionButtons = document.getElementById('actionButtons');
    const predictBtn = document.getElementById('predictBtn');
    const openUpload = document.getElementById('openUpload');
    const predictionResult = document.getElementById('predictionResult');

    if (!uploadBox || !fileInput || !preview || !previewContainer) {
      console.warn('[Upload] Required elements not found');
      return;
    }

    /**
     * Handle file selection/upload
     */
    async function handleFile(file) {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        handleError(null, validation.error);
        return;
      }

      try {
        // Convert to base64 for preview and backend
        const base64 = await fileToBase64(file);
        
        // Update state
        currentFile = file;
        currentPreviewSrc = base64;

        // Update UI
        preview.src = base64;
        // Show preview container (override inline display:none)
        previewContainer.style.setProperty('display', 'flex', 'important');
        
        if (uploadPlaceholder) {
          uploadPlaceholder.style.display = 'none';
        }
        
        // Show action buttons container
        if (actionButtons) {
          actionButtons.style.display = 'flex';
        }
        
        if (predictBtn) {
          predictBtn.disabled = false;
        }

        // Clear previous prediction
        if (predictionResult) {
          predictionResult.innerHTML = '<span class="subtle">Image loaded. Click "Analyze Image" to run prediction.</span>';
          predictionResult.classList.remove('normal', 'pneumonia');
        }

        showToast('Image loaded successfully');
      } catch (error) {
        handleError(error, 'Failed to load image');
      }
    }

    /**
     * Reset upload state
     */
    function resetUpload() {
      currentFile = null;
      currentPreviewSrc = null;
      if (fileInput) fileInput.value = '';
      if (preview) preview.src = '';
      if (previewContainer) previewContainer.style.display = 'none';
      if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
      if (actionButtons) actionButtons.style.display = 'none';
      if (predictBtn) predictBtn.disabled = true;
      if (predictionResult) {
        predictionResult.innerHTML = '<span class="subtle">No prediction yet. Upload an image to begin.</span>';
        predictionResult.classList.remove('normal', 'pneumonia');
      }
    }

    // Drag and drop handlers
    uploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadBox.classList.add('drag-over');
    });

    uploadBox.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadBox.classList.remove('drag-over');
    });

    uploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadBox.classList.remove('drag-over');

      const file = e.dataTransfer?.files?.[0];
      if (file) {
        // Update fileInput to reflect dropped file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        handleFile(file);
      }
    });

    // Prevent double-trigger: only handle clicks on uploadBox when placeholder is visible
    uploadBox.addEventListener('click', (e) => {
      // Only trigger if clicking on the uploadBox itself (not on child elements)
      if (e.target === uploadBox || e.target === uploadPlaceholder || uploadPlaceholder?.contains(e.target)) {
        // Don't trigger if preview is already showing
        if (previewContainer.style.display === 'none' || !previewContainer.style.display) {
          e.preventDefault();
          e.stopPropagation();
          if (fileInput) fileInput.click();
        }
      }
    });

    // Keyboard support
    uploadBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (fileInput && (previewContainer.style.display === 'none' || !previewContainer.style.display)) {
          fileInput.click();
        }
      }
    });

    // File input change - prevent double handling
    let isProcessingFile = false;
    fileInput.addEventListener('change', (e) => {
      if (isProcessingFile) return;
      const file = e.target.files?.[0];
      if (file) {
        isProcessingFile = true;
        Promise.resolve(handleFile(file)).finally(() => {
          isProcessingFile = false;
        });
      }
    });

    // Change/Re-upload button
    if (openUpload) {
      openUpload.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (fileInput) fileInput.click();
      });
    }

    // Expose reset function
    window.resetUpload = resetUpload;
  }

  // ============================================================================
  // PREDICTION MODULE
  // ============================================================================

  let isPredicting = false;

  function initPrediction() {
    const predictBtn = document.getElementById('predictBtn');
    const predictionResult = document.getElementById('predictionResult');
    const preview = document.getElementById('preview');

    if (!predictBtn || !predictionResult) {
      console.warn('[Prediction] Required elements not found');
      return;
    }

    /**
     * Set prediction button loading state
     */
    function setPredictLoading(loading) {
      if (!predictBtn) return;
      
      predictBtn.disabled = loading;
      
      // Update button content
      const icon = predictBtn.querySelector('i');
      const text = predictBtn.childNodes;
      
      if (loading) {
        // Show spinner
        if (!predictBtn.querySelector('.spinner')) {
          const spinner = document.createElement('span');
          spinner.className = 'spinner';
          spinner.style.marginRight = '0.5rem';
          predictBtn.insertBefore(spinner, icon);
        }
        if (icon) icon.style.display = 'none';
      } else {
        // Hide spinner
        const spinner = predictBtn.querySelector('.spinner');
        if (spinner) spinner.remove();
        if (icon) icon.style.display = 'inline';
      }
    }

    /**
     * Display prediction result
     */
    function displayResult(result) {
      if (!predictionResult) return;

      const resultUpper = result.toUpperCase();
      predictionResult.classList.remove('normal', 'pneumonia');

      if (resultUpper.includes('PNEUMONIA')) {
        predictionResult.classList.add('pneumonia');
        predictionResult.innerHTML = `
          <span class="badge pneumonia">PNEUMONIA</span>
          <div style="margin-left: 0.5rem;">
            The model indicates possible pneumonia. Please consult a healthcare professional.
          </div>
        `;
        showToast('Prediction: PNEUMONIA detected', 4000);
      } else if (resultUpper.includes('NORMAL')) {
        predictionResult.classList.add('normal');
        predictionResult.innerHTML = `
          <span class="badge normal">NORMAL</span>
          <div style="margin-left: 0.5rem;">
            No signs of pneumonia detected by the model.
          </div>
        `;
        showToast('Prediction: NORMAL - No pneumonia detected', 4000);
      } else {
        predictionResult.innerHTML = `
          <div style="margin-left: 0.25rem;">${result}</div>
        `;
      }
    }

    /**
     * Run prediction
     */
    async function runPrediction() {
      // Prevent double submission
      if (isPredicting) {
        showToast('Prediction already in progress...');
        return;
      }

      // Validate state
      if (!currentPreviewSrc) {
        handleError(null, 'Please upload an image first');
        return;
      }

      isPredicting = true;
      setPredictLoading(true);

      if (predictionResult) {
        predictionResult.innerHTML = '<span class="loading"><span class="spinner"></span> Analyzing image...</span>';
      }

      showToast('Sending image for analysis...');

      try {
        // Prepare request body - backend expects base64 string (util.py handles both string and {image: string})
        const response = await fetch('/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(currentPreviewSrc),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        const result = data.result || 'Unknown';

        // Display result
        displayResult(result);

        // Save to Supabase history
        await saveToHistory(result, currentPreviewSrc);

        // Reload history list
        loadHistory();

      } catch (error) {
        const errorMsg = error.message || 'Prediction failed';
        handleError(error, `Prediction error: ${errorMsg}`);
        
        if (predictionResult) {
          predictionResult.innerHTML = `<span style="color: var(--danger);">Error: ${errorMsg}</span>`;
        }
      } finally {
        isPredicting = false;
        setPredictLoading(false);
      }
    }

    // Attach click handler
    predictBtn.addEventListener('click', runPrediction);
  }

  // ============================================================================
  // HISTORY MODULE
  // ============================================================================

  async function saveToHistory(result, imageBase64) {
    try {
      const client = window.__supabase;
      if (!client) {
        console.warn('[History] Supabase client not available');
        return;
      }

      // Create thumbnail (optional - can be simplified)
      const thumbBase64 = imageBase64; // Use full image as thumb for simplicity

      await client
        .from('predictions')
        .insert({
          result: result,
          image_url: thumbBase64, // Store base64 or URL
          created_at: new Date().toISOString(),
        });

      console.log('[History] Saved prediction to history');
    } catch (error) {
      console.warn('[History] Failed to save to history:', error);
      // Don't show error to user - history is non-critical
    }
  }

  function loadHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    (async () => {
      try {
        const client = window.__supabase;
        if (!client) {
          historyList.innerHTML = '<div class="subtle">History unavailable (not authenticated)</div>';
          return;
        }

        const { data, error } = await client
          .from('predictions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        if (!data || data.length === 0) {
          historyList.innerHTML = '<div class="subtle">No prediction history yet — run your first analysis.</div>';
          return;
        }

        // Render history cards
        historyList.innerHTML = data
          .map((item) => {
            const result = item.result || 'Unknown';
            const time = new Date(item.created_at).toLocaleString();
            const isPneumonia = result.toUpperCase().includes('PNEUMONIA');
            const thumbSrc = item.image_url || '';

            return `
              <div class="history-card">
                <div class="history-thumb">
                  ${thumbSrc ? `<img src="${thumbSrc}" alt="X-ray" style="width: 100%; height: 100%; object-fit: cover;" />` : 'X-ray'}
                </div>
                <div class="history-meta">
                  <div class="result" style="color: ${isPneumonia ? 'var(--danger)' : 'var(--ok)'};">
                    ${result}
                  </div>
                  <div class="time">${time}</div>
                </div>
              </div>
            `;
          })
          .join('');

      } catch (error) {
        console.error('[History] Load failed:', error);
        historyList.innerHTML = '<div class="subtle">Unable to load history.</div>';
      }
    })();
  }

  // ============================================================================
  // CHAT/ASSISTANT MODULE
  // ============================================================================

  function initChat() {
    const chat = document.getElementById('chat');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');

    if (!chat || !chatForm || !chatInput) {
      console.warn('[Chat] Required elements not found');
      return;
    }

    let isSending = false;

    /**
     * Add message to chat
     */
    function addMessage(role, text) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-msg ${role}`;
      
      // Render markdown for assistant messages, plain text for user messages
      if (role === 'assistant' && typeof marked !== 'undefined') {
        // Use marked.js to render markdown
        msgDiv.innerHTML = marked.parse(text);
      } else {
        // Use textContent for user messages to prevent XSS
        msgDiv.textContent = text;
      }
      
      chat.appendChild(msgDiv);
      scrollChatToBottom();
    }

    /**
     * Scroll chat to bottom
     */
    function scrollChatToBottom() {
      if (chat) {
        chat.scrollTop = chat.scrollHeight;
      }
    }

    /**
     * Send message to Gemini
     */
    async function sendMessage(message) {
      if (isSending) {
        showToast('Please wait for the current message to complete');
        return;
      }

      isSending = true;
      const sendButton = chatForm.querySelector('button[type="submit"]');
      if (sendButton) sendButton.disabled = true;

      // Show typing indicator
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'chat-msg assistant';
      typingIndicator.textContent = 'Assistant is typing...';
      typingIndicator.dataset.typing = 'true';
      chat.appendChild(typingIndicator);
      scrollChatToBottom();

      try {
        const response = await fetch('/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            model: 'gemini-2.0-flash',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error || `Server error: ${response.status}`;
          const errorDetail = errorData.detail ? ` (${JSON.stringify(errorData.detail)})` : '';
          throw new Error(`${errorMsg}${errorDetail}`);
        }

        const data = await response.json();
        const reply = data.reply || 'Sorry, I could not generate a response.';

        // Remove typing indicator
        typingIndicator.remove();

        // Add assistant reply
        addMessage('assistant', reply);

      } catch (error) {
        typingIndicator.remove();
        const errorMsg = error.message || 'Failed to contact assistant';
        handleError(error, `Chat error: ${errorMsg}`);
        addMessage('assistant', `Error: ${errorMsg}`);
      } finally {
        isSending = false;
        if (sendButton) sendButton.disabled = false;
      }
    }

    // Form submission
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;

      // Add user message
      addMessage('user', message);
      chatInput.value = '';

      // Send to backend
      await sendMessage(message);
    });

    // Auto-scroll on new messages
    const chatObserver = new MutationObserver(() => {
      scrollChatToBottom();
    });
    chatObserver.observe(chat, { childList: true });
  }

  // ============================================================================
  // LOGOUT MODULE
  // ============================================================================

  function initLogout() {
    const logoutBtn = document.querySelector('.btn-logout');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      showToast('Signing out...');

      try {
        // Sign out from Supabase
        if (window.__supabase) {
          try {
            await window.__supabase.auth.signOut();
          } catch (err) {
            console.warn('[Logout] Supabase signOut error:', err);
          }
        }

        // Call backend logout
        try {
          await fetch('/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch (err) {
          console.warn('[Logout] Backend logout error:', err);
          // Continue with redirect even if backend fails
        }

        // Always redirect, even if logout fails
        window.location.href = '/';
      } catch (error) {
        console.error('[Logout] Unexpected error:', error);
        // Still redirect on error
        window.location.href = '/';
      }
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize dashboard when DOM is ready
   */
  function initDashboard() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDashboard);
      return;
    }

    console.log('[Dashboard] Initializing...');

    // Initialize all modules
    initNavigation();
    initUpload();
    initPrediction();
    initChat();
    initLogout();

    // Load history on page load
    loadHistory();

    // Expose utility functions globally (for compatibility)
    window.showToast = showToast;
    window.loadHistory = loadHistory;

    console.log('[Dashboard] Initialization complete');
  }

  // Start initialization
  initDashboard();
})();
