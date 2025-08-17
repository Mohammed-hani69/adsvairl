// Handle image preview
function handleImagePreview(input) {
    const files = input.files;
    const preview = document.getElementById('image-preview');
    
    if (files.length > 0) {
        preview.classList.remove('hidden');
        preview.innerHTML = '';
        
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const div = document.createElement('div');
                div.className = 'relative group rounded-lg overflow-hidden';
                div.innerHTML = `
                    <img src="${e.target.result}" class="w-full h-32 object-cover" alt="Preview ${index + 1}">
                    <div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="text-white text-sm">صورة ${index + 1}</span>
                    </div>
                `;
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    } else {
        preview.classList.add('hidden');
    }
}

// Handle form submission
function handleFormSubmission(form, e) {
    e.preventDefault();
    
    // Get files without size validation
    const files = form.querySelector('#images').files;
    
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> جاري النشر...';
    submitBtn.disabled = true;
    
    fetch('/api/ads', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let modalMessage = data.message;
            
            // Add account information if available
            if (data.account_created) {
                modalMessage += `\n\nتم إنشاء حساب جديد لك:\nاسم المستخدم: ${data.username}\nكلمة المرور: ${data.password}\n\nيرجى الاحتفاظ بهذه المعلومات للدخول لاحقاً.`;
            } else if (data.account_message) {
                modalMessage += `\n\n${data.account_message}`;
            }
            
            showSuccessModal(data, modalMessage);
        } else {
            showErrorToast(data.message || 'حدث خطأ أثناء نشر الإعلان');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showErrorToast('حدث خطأ أثناء نشر الإعلان. يرجى المحاولة مرة أخرى.');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

// Success Modal Functions
function showSuccessModal(data, message) {
    const modal = document.getElementById('success-modal');
    const messageEl = document.getElementById('success-message');
    const adUrlInput = document.getElementById('ad-url-input');
    const viewAdBtn = document.getElementById('view-ad-btn');
    
    // Update message
    messageEl.innerHTML = message.replace(/\n/g, '<br>');
    
    // Update URL and buttons
    if (data.ad_url) {
        currentAdUrl = data.ad_url;
        currentAdId = data.ad_id;
        currentAdSlug = data.ad_slug;
        
        adUrlInput.value = currentAdUrl;
        viewAdBtn.onclick = () => window.location.href = currentAdUrl;
    }
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Auto redirect after 10 seconds if no account was created
    if (!message.includes('تم إنشاء حساب جديد')) {
        setTimeout(() => {
            window.location.href = data.redirect_url;
        }, 10000);
    }
    
    document.body.style.overflow = 'hidden';
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    // Reset form and preview
    const form = document.getElementById('add-ad-form');
    const preview = document.getElementById('image-preview');
    
    form.reset();
    preview.innerHTML = '';
    preview.classList.add('hidden');
}

function copyAdUrl() {
    const urlInput = document.getElementById('ad-url-input');
    const copyBtn = document.getElementById('copy-url-btn');
    const originalIcon = copyBtn.innerHTML;
    
    navigator.clipboard.writeText(currentAdUrl)
        .then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            copyBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            copyBtn.classList.add('bg-green-600', 'scale-110');
            
            showToast('تم نسخ الرابط بنجاح!', 'success');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                copyBtn.classList.remove('bg-green-600', 'scale-110');
                copyBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }, 2000);
        })
        .catch(err => {
            console.error('فشل في نسخ الرابط: ', err);
            showToast('فشل في نسخ الرابط. يرجى المحاولة يدوياً.', 'error');
        });
}

function shareAd() {
    if (navigator.share) {
        navigator.share({
            title: 'شاهد هذا الإعلان الرائع!',
            text: 'إعلان جديد تم نشره للتو',
            url: currentAdUrl
        })
        .then(() => showToast('تم مشاركة الإعلان بنجاح!', 'success'))
        .catch(error => {
            if (error.name !== 'AbortError') {
                console.error('خطأ في المشاركة:', error);
                copyAdUrl(); // Fallback to copy
            }
        });
    } else {
        copyAdUrl();
        showToast('تم نسخ الرابط. يمكنك مشاركته الآن!', 'info');
    }
}

function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    const bgColor = {
        success: 'bg-green-600 border-green-700',
        error: 'bg-red-600 border-red-700',
        info: 'bg-blue-600 border-blue-700'
    }[type] || 'bg-gray-600 border-gray-700';
    
    const icon = {
        success: 'check',
        error: 'times',
        info: 'info-circle'
    }[type] || 'bell';
    
    toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg border-l-4 max-w-sm transform transition-all duration-300 translate-x-full flex items-center gap-3`;
    toast.innerHTML = `<i class="fas fa-${icon}"></i>${message}`;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-x-full'), 100);
    setTimeout(() => removeToast(toast), 4000);
}

function removeToast(toast) {
    if (toast && toast.parentElement) {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            toast.parentElement?.removeChild(toast);
        }, 300);
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('add-ad-form');
    const imageInput = document.getElementById('images');
    const modal = document.getElementById('success-modal');
    
    // Image preview
    imageInput?.addEventListener('change', function() {
        handleImagePreview(this);
    });
    
    // Form submission
    form?.addEventListener('submit', function(e) {
        handleFormSubmission(this, e);
    });
    
    // Modal controls
    document.getElementById('copy-url-btn')?.addEventListener('click', copyAdUrl);
    document.getElementById('share-btn')?.addEventListener('click', shareAd);
    document.getElementById('close-modal-btn')?.addEventListener('click', closeSuccessModal);
    
    // Close modal on outside click
    modal?.addEventListener('click', function(e) {
        if (e.target === this) closeSuccessModal();
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !modal?.classList.contains('hidden')) {
            closeSuccessModal();
        }
    });
});
