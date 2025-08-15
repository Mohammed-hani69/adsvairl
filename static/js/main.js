// Main JavaScript file for classified ads platform

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize application
function initializeApp() {
    // Initialize search functionality
    initializeSearch();
    
    // Initialize category navigation
    initializeCategoryNav();
    
    // Initialize ad form if exists
    if (document.getElementById('add-ad-form')) {
        initializeAddAdForm();
    }
    
    // Initialize image upload if exists
    if (document.getElementById('image-upload')) {
        initializeImageUpload();
    }
    
    // Initialize location dropdowns
    initializeLocationDropdowns();
    
    // Initialize admin panel if exists
    if (document.querySelector('.admin-container')) {
        initializeAdminPanel();
    }
}

// Search functionality
function initializeSearch() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `/search?q=${encodeURIComponent(query)}`;
            }
        });
    }
    
    // Live search suggestions
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length > 2) {
                searchTimeout = setTimeout(() => {
                    // Implement live search suggestions here
                    // fetchSearchSuggestions(query);
                }, 300);
            }
        });
    }
}

// Category navigation
function initializeCategoryNav() {
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.closest('a')) {
                const categoryId = this.dataset.categoryId;
                if (categoryId) {
                    window.location.href = `/category/${categoryId}`;
                }
            }
        });
    });
}

// Add ad form functionality
function initializeAddAdForm() {
    const form = document.getElementById('add-ad-form');
    const submitBtn = document.getElementById('submit-btn');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading state
            submitBtn.innerHTML = '<span class="spinner"></span> جاري النشر...';
            submitBtn.disabled = true;
            
            // Create FormData object
            const formData = new FormData(form);
            
            // Submit form via AJAX
            fetch('/api/ads', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showAlert('تم نشر الإعلان بنجاح!', 'success');
                    // Redirect to ad details page
                    setTimeout(() => {
                        window.location.href = `/ad/${data.ad_id}`;
                    }, 1500);
                } else {
                    showAlert(data.error || 'حدث خطأ أثناء نشر الإعلان', 'danger');
                    submitBtn.innerHTML = 'نشر الإعلان';
                    submitBtn.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('حدث خطأ في الاتصال', 'danger');
                submitBtn.innerHTML = 'نشر الإعلان';
                submitBtn.disabled = false;
            });
        });
    }
}

// Image upload functionality
function initializeImageUpload() {
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const uploadButton = document.querySelector('.upload-button');
    
    if (imageUpload) {
        imageUpload.addEventListener('change', function(e) {
            const files = e.target.files;
            
            if (files.length > 0) {
                imagePreview.innerHTML = '';
                
                for (let i = 0; i < Math.min(files.length, 5); i++) {
                    const file = files[i];
                    
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        
                        reader.onload = function(e) {
                            const imgContainer = document.createElement('div');
                            imgContainer.className = 'col-md-3 mb-3';
                            
                            imgContainer.innerHTML = `
                                <div class="image-preview-item position-relative">
                                    <img src="${e.target.result}" class="img-fluid rounded" alt="Preview">
                                    <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1" 
                                            onclick="removeImagePreview(this)">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            `;
                            
                            imagePreview.appendChild(imgContainer);
                        };
                        
                        reader.readAsDataURL(file);
                    }
                }
            }
        });
        
        // Upload button click
        if (uploadButton) {
            uploadButton.addEventListener('click', function() {
                imageUpload.click();
            });
        }
    }
}

// Remove image preview
function removeImagePreview(button) {
    const container = button.closest('.col-md-3');
    if (container) {
        container.remove();
    }
}

// Location dropdowns (Country > State > City)
function initializeLocationDropdowns() {
    const countrySelect = document.getElementById('country');
    const stateSelect = document.getElementById('state');
    const citySelect = document.getElementById('city');
    
    if (countrySelect && stateSelect) {
        countrySelect.addEventListener('change', function() {
            const countryId = this.value;
            
            // Clear state and city
            stateSelect.innerHTML = '<option value="">اختر المحافظة</option>';
            citySelect.innerHTML = '<option value="">اختر المدينة</option>';
            
            if (countryId) {
                // Fetch states
                fetch(`/api/states/${countryId}`)
                    .then(response => response.json())
                    .then(states => {
                        states.forEach(state => {
                            const option = document.createElement('option');
                            option.value = state.id;
                            option.textContent = state.name;
                            stateSelect.appendChild(option);
                        });
                    })
                    .catch(error => console.error('Error loading states:', error));
            }
        });
    }
    
    if (stateSelect && citySelect) {
        stateSelect.addEventListener('change', function() {
            const stateId = this.value;
            
            // Clear cities
            citySelect.innerHTML = '<option value="">اختر المدينة</option>';
            
            if (stateId) {
                // Fetch cities
                fetch(`/api/cities/${stateId}`)
                    .then(response => response.json())
                    .then(cities => {
                        cities.forEach(city => {
                            const option = document.createElement('option');
                            option.value = city.id;
                            option.textContent = city.name;
                            citySelect.appendChild(option);
                        });
                    })
                    .catch(error => console.error('Error loading cities:', error));
            }
        });
    }
}

// Admin panel functionality
function initializeAdminPanel() {
    // Initialize admin navigation
    const navLinks = document.querySelectorAll('.admin-nav-link');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
    
    // Initialize data tables if they exist
    initializeDataTables();
    
    // Initialize admin forms
    initializeAdminForms();
}

// Data tables functionality
function initializeDataTables() {
    const tables = document.querySelectorAll('.data-table');
    
    tables.forEach(table => {
        // Add basic table enhancements
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            row.addEventListener('click', function() {
                // Handle row selection
                this.classList.toggle('table-active');
            });
        });
    });
}

// Admin forms
function initializeAdminForms() {
    // Handle status updates
    const statusButtons = document.querySelectorAll('[data-action]');
    
    statusButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.dataset.action;
            const id = this.dataset.id;
            const type = this.dataset.type;
            
            if (action && id && type) {
                updateStatus(type, id, action, this);
            }
        });
    });
}

// Update status (approve, reject, delete)
function updateStatus(type, id, action, button) {
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="spinner"></span>';
    button.disabled = true;
    
    fetch(`/admin/api/${type}/${id}/${action}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message || 'تم التحديث بنجاح', 'success');
            
            // Update UI based on action
            if (action === 'delete') {
                button.closest('tr').remove();
            } else {
                // Update button or row styling
                updateRowStatus(button.closest('tr'), action);
            }
        } else {
            showAlert(data.error || 'حدث خطأ أثناء التحديث', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('حدث خطأ في الاتصال', 'danger');
    })
    .finally(() => {
        button.innerHTML = originalText;
        button.disabled = false;
    });
}

// Update row status visual indication
function updateRowStatus(row, action) {
    row.classList.remove('table-warning', 'table-success', 'table-danger');
    
    switch (action) {
        case 'approve':
            row.classList.add('table-success');
            break;
        case 'reject':
            row.classList.add('table-danger');
            break;
        default:
            row.classList.add('table-warning');
    }
}

// Show alert messages
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-custom');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show alert-custom position-fixed`;
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Utility functions
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, seconds] of Object.entries(intervals)) {
        const interval = Math.floor(diffInSeconds / seconds);
        if (interval >= 1) {
            return `منذ ${interval} ${getArabicUnit(unit, interval)}`;
        }
    }
    
    return 'منذ لحظات';
}

function getArabicUnit(unit, count) {
    const units = {
        year: count === 1 ? 'سنة' : count === 2 ? 'سنتين' : 'سنوات',
        month: count === 1 ? 'شهر' : count === 2 ? 'شهرين' : 'أشهر',
        week: count === 1 ? 'أسبوع' : count === 2 ? 'أسبوعين' : 'أسابيع',
        day: count === 1 ? 'يوم' : count === 2 ? 'يومين' : 'أيام',
        hour: count === 1 ? 'ساعة' : count === 2 ? 'ساعتين' : 'ساعات',
        minute: count === 1 ? 'دقيقة' : count === 2 ? 'دقيقتين' : 'دقائق'
    };
    
    return units[unit] || unit;
}

// Export functions for global use
window.showAlert = showAlert;
window.removeImagePreview = removeImagePreview;
window.updateStatus = updateStatus;