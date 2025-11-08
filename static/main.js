// Pneumonia Detection App JavaScript

let selectedFile = null;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    const fileUpload = document.getElementById('file-upload');
    const fileDrag = document.getElementById('file-drag');
    const uploadCaption = document.getElementById('upload-caption');
    const imagePreview = document.getElementById('image-preview');
    
    // File input change handler
    fileUpload.addEventListener('change', function(e) {
        handleFileSelect(e.target.files[0]);
    });
    
    // Drag and drop handlers
    fileDrag.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileDrag.classList.add('dragover');
    });
    
    fileDrag.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileDrag.classList.remove('dragover');
    });
    
    fileDrag.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileDrag.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // Click handler for upload area
    fileDrag.addEventListener('click', function() {
        fileUpload.click();
    });
}

function handleFileSelect(file) {
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
        alert('Please select a valid image file.');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File size too large. Please select an image smaller than 10MB.');
        return;
    }
    
    selectedFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const imagePreview = document.getElementById('image-preview');
        const uploadCaption = document.getElementById('upload-caption');
        
        imagePreview.src = e.target.result;
        imagePreview.classList.remove('hidden');
        uploadCaption.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function submitImage() {
    if (!selectedFile) {
        alert('Please select an image first.');
        return;
    }
    
    // Show loading state
    showLoading();
    
    // Convert image to base64
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        
        // Send to backend
        fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(base64Image)
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            displayResult(data.result);
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            alert('An error occurred while processing the image. Please try again.');
        });
    };
    reader.readAsDataURL(selectedFile);
}

function clearImage() {
    // Reset file input
    document.getElementById('file-upload').value = '';
    
    // Hide preview
    const imagePreview = document.getElementById('image-preview');
    const uploadCaption = document.getElementById('upload-caption');
    
    imagePreview.classList.add('hidden');
    uploadCaption.classList.remove('hidden');
    
    // Clear result
    clearResult();
    
    // Reset selected file
    selectedFile = null;
}

function showLoading() {
    const loader = document.getElementById('loader');
    const imageDisplay = document.getElementById('image-display');
    const predResult = document.getElementById('pred-result');
    
    loader.classList.remove('hidden');
    imageDisplay.classList.add('hidden');
    predResult.classList.add('hidden');
}

function hideLoading() {
    const loader = document.getElementById('loader');
    loader.classList.add('hidden');
}

function displayResult(result) {
    const imageDisplay = document.getElementById('image-display');
    const predResult = document.getElementById('pred-result');
    
    // Show the uploaded image
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imageDisplay.src = e.target.result;
            imageDisplay.classList.remove('hidden');
        };
        reader.readAsDataURL(selectedFile);
    }
    
    // Display result
    predResult.textContent = result;
    predResult.classList.remove('hidden');
    
    // Add appropriate styling based on result
    predResult.classList.remove('pneumonia', 'normal');
    if (result === 'PNEUMONIA') {
        predResult.classList.add('pneumonia');
    } else if (result === 'NORMAL') {
        predResult.classList.add('normal');
    }
}

function clearResult() {
    const imageDisplay = document.getElementById('image-display');
    const predResult = document.getElementById('pred-result');
    
    imageDisplay.classList.add('hidden');
    predResult.classList.add('hidden');
    predResult.textContent = '';
    predResult.classList.remove('pneumonia', 'normal');
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
