function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to clicked tab button
    event.target.closest('.tab').classList.add('active');

    // Scroll to top of tab content
    if (selectedTab) {
        selectedTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Generate a unique ID for each assessment item
function getAssessmentItemId(placeholder) {
    const assessmentItem = placeholder.closest('.assessment-item');
    const pageCard = assessmentItem.closest('.page-assessment-card');
    const breakpointAssessment = assessmentItem.closest('.breakpoint-assessment');
    const category = assessmentItem.closest('.critical, .friction, .opportunity');
    
    const page = pageCard.getAttribute('data-page') || 'unknown';
    const breakpoint = breakpointAssessment.getAttribute('data-breakpoint') || 'unknown';
    const categoryName = category.className.includes('critical') ? 'critical' : 
                        category.className.includes('friction') ? 'friction' : 'opportunity';
    
    // Get the index of this item in its list
    const listItems = Array.from(category.querySelectorAll('.assessment-item'));
    const index = listItems.indexOf(assessmentItem);
    
    return `${page}-${breakpoint}-${categoryName}-${index}`;
}

// IndexedDB setup
let db = null;

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MrVitaminsReviewDB', 2);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains('images')) {
                db.createObjectStore('images', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('suggestions')) {
                db.createObjectStore('suggestions', { keyPath: 'id' });
            }
        };
    });
}

// Save image to IndexedDB
function saveImageToStorage(imageId, imageDataUrl) {
    return new Promise((resolve, reject) => {
        if (!db) {
            initIndexedDB().then(() => {
                saveImageToStorage(imageId, imageDataUrl).then(resolve).catch(reject);
            }).catch(reject);
            return;
        }
        
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.put({ id: imageId, data: imageDataUrl, timestamp: Date.now() });
        
        request.onsuccess = () => {
            console.log(`Image saved to IndexedDB: ${imageId}`);
            resolve();
        };
        
        request.onerror = () => {
            console.error('Error saving image to IndexedDB:', request.error);
            reject(request.error);
        };
    });
}

// Load image from IndexedDB
function loadImageFromStorage(imageId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            initIndexedDB().then(() => {
                loadImageFromStorage(imageId).then(resolve).catch(reject);
            }).catch(reject);
            return;
        }
        
        const transaction = db.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        const request = store.get(imageId);
        
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.data);
            } else {
                resolve(null);
            }
        };
        
        request.onerror = () => {
            console.error('Error loading image from IndexedDB:', request.error);
            reject(request.error);
        };
    });
}

// Clear all images from IndexedDB (utility function)
function clearAllImages() {
    return new Promise((resolve, reject) => {
        if (!db) {
            initIndexedDB().then(() => {
                clearAllImages().then(resolve).catch(reject);
            }).catch(reject);
            return;
        }
        
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.clear();
        
        request.onsuccess = () => {
            console.log('All images cleared from IndexedDB');
            resolve();
        };
        
        request.onerror = () => {
            console.error('Error clearing images:', request.error);
            reject(request.error);
        };
    });
}

// Handle image paste into placeholder
function handleImagePaste(event, placeholder) {
    event.preventDefault();
    
    const items = event.clipboardData?.items || event.clipboardData?.files || [];
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Check if the item is an image
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile ? item.getAsFile() : item;
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const imageDataUrl = e.target.result;
                const imageContainer = placeholder.parentElement;
                const imageId = getAssessmentItemId(placeholder);
                
                // Create and display image
                const img = document.createElement('img');
                img.src = imageDataUrl;
                img.alt = 'Assessment image';
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.borderRadius = '4px';
                
                // CRITICAL: Save image data directly to HTML data attribute for persistence
                imageContainer.setAttribute('data-image-src', imageDataUrl);
                img.setAttribute('data-saved-image', 'true');
                
                // Replace placeholder with image
                imageContainer.innerHTML = '';
                imageContainer.appendChild(img);
                
                // Save image to IndexedDB (backup)
                saveImageToStorage(imageId, imageDataUrl).catch(error => {
                    console.error('Failed to save image to IndexedDB:', error);
                });
                
                // Save image to images folder (if possible)
                saveImageToFile(imageId, imageDataUrl);
                
                // Auto-save HTML immediately
                autoSaveHTML();
                
                // Images are visible by default, ensure container is not hidden
                imageContainer.classList.remove('hidden');
                const toggleBtn = imageContainer.closest('.assessment-item').querySelector('.image-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.classList.add('active');
                    toggleBtn.textContent = '✕';
                }
            };
            
            reader.readAsDataURL(blob);
            break;
        }
    }
}

// Toggle image visibility for assessment items
function toggleImage(button) {
    const assessmentItem = button.closest('.assessment-item');
    const imageContainer = assessmentItem.querySelector('.assessment-image-container');
    
    if (imageContainer) {
        imageContainer.classList.toggle('hidden');
        button.classList.toggle('active');
        
        // Update button text (✕ when visible, 📷 when hidden)
        if (imageContainer.classList.contains('hidden')) {
            button.textContent = '📷';
        } else {
            button.textContent = '✕';
        }
    }
}

// Breakpoint switching function
function switchBreakpoint(button, pageName) {
    const breakpoint = button.getAttribute('data-breakpoint');
    const pageCard = button.closest('.page-assessment-card');
    
    // Remove active class from all breakpoint badges in this page
    pageCard.querySelectorAll('.breakpoint-badge').forEach(badge => {
        badge.classList.remove('active');
    });
    
    // Add active class to clicked badge
    button.classList.add('active');
    
    // Hide all screenshot containers in this page
    pageCard.querySelectorAll('.screenshot-container').forEach(container => {
        container.classList.remove('active');
    });
    
    // Show the screenshot container for selected breakpoint
    const screenshotContainer = pageCard.querySelector(`.screenshot-container[data-breakpoint="${breakpoint}"]`);
    if (screenshotContainer) {
        screenshotContainer.classList.add('active');
    }
    
    // Hide all assessment sections in this page
    pageCard.querySelectorAll('.breakpoint-assessment').forEach(assessment => {
        assessment.classList.remove('active');
    });
    
    // Show the assessment section for selected breakpoint
    const assessment = pageCard.querySelector(`.breakpoint-assessment[data-breakpoint="${breakpoint}"]`);
    if (assessment) {
        assessment.classList.add('active');
    }
    
    // Hide empty sections after breakpoint switch
    setTimeout(hideEmptySections, 50);
}

// Initialize: Ensure first tab is active on page load
document.addEventListener('DOMContentLoaded', function() {
    const firstTab = document.querySelector('.tab.active');
    const firstTabContent = document.querySelector('.tab-content.active');
    
    if (!firstTab || !firstTabContent) {
        // If no active tab is set, activate the first one
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        if (tabs.length > 0 && tabContents.length > 0) {
            tabs[0].classList.add('active');
            tabContents[0].classList.add('active');
        }
    }
    
    // Initialize first breakpoint for each page
    document.querySelectorAll('.page-assessment-card').forEach(pageCard => {
        const firstBadge = pageCard.querySelector('.breakpoint-badge.active');
        if (firstBadge) {
            const breakpoint = firstBadge.getAttribute('data-breakpoint');
            const pageName = pageCard.getAttribute('data-page') || 'home';
            switchBreakpoint(firstBadge, pageName);
        }
    });
    
    // Hide empty sections on page load
    hideEmptySections();
    
    // Set up suggested improvement content saving
    document.querySelectorAll('.suggested-improvement-content').forEach(contentBox => {
        // Load saved content and priority
        const assessmentItem = contentBox.closest('.assessment-item');
        if (assessmentItem) {
            const itemId = getSuggestedImprovementId(assessmentItem);
            if (itemId) {
                loadSuggestedImprovement(itemId).then(savedData => {
                    if (savedData) {
                        if (savedData.content) {
                            contentBox.textContent = savedData.content;
                        }
                        const priorityBox = contentBox.closest('.suggested-improvement-box');
                        if (savedData.priority) {
                            const priorityBtn = priorityBox.querySelector(`.priority-btn[data-priority="${savedData.priority}"]`);
                            if (priorityBtn) {
                                priorityBtn.classList.add('active');
                            }
                        }
                        if (savedData.effort) {
                            const effortBtn = priorityBox.querySelector(`.effort-btn[data-effort="${savedData.effort}"]`);
                            if (effortBtn) {
                                effortBtn.classList.add('active');
                            }
                        }
                    }
                });
            }
        }
        
        // Save on input - CRITICAL: Save directly to HTML for 100% persistence
        contentBox.addEventListener('input', function() {
            const assessmentItem = this.closest('.assessment-item');
            const priorityBox = this.closest('.suggested-improvement-box');
            const activePriorityBtn = priorityBox.querySelector('.priority-btn.active');
            const activeEffortBtn = priorityBox.querySelector('.effort-btn.active');
            const priority = activePriorityBtn ? activePriorityBtn.getAttribute('data-priority') : null;
            const effort = activeEffortBtn ? activeEffortBtn.getAttribute('data-effort') : null;
            
            // Save directly to HTML data attributes for 100% persistence
            this.setAttribute('data-saved-content', this.textContent);
            if (priority) {
                this.setAttribute('data-saved-priority', priority);
            }
            if (effort) {
                this.setAttribute('data-saved-effort', effort);
            }
            
            // Also save to IndexedDB as backup
            if (assessmentItem) {
                const itemId = getSuggestedImprovementId(assessmentItem);
                if (itemId) {
                    saveSuggestedImprovement(itemId, this.textContent, priority, effort);
                }
            }
            
            // Auto-save HTML immediately
            autoSaveHTML();
        });
        
        // Handle placeholder
        contentBox.addEventListener('focus', function() {
            if (this.textContent === this.getAttribute('data-placeholder')) {
                this.textContent = '';
            }
        });
        
        contentBox.addEventListener('blur', function() {
            if (this.textContent.trim() === '') {
                this.textContent = '';
            }
        });
    });
    
    // Set up paste handlers for all image placeholders
    document.querySelectorAll('.assessment-image-placeholder').forEach(placeholder => {
        // Make it focusable for paste
        placeholder.addEventListener('click', function() {
            this.focus();
        });
        
        // Handle paste event
        placeholder.addEventListener('paste', function(e) {
            handleImagePaste(e, this);
        });
        
        // Show instructions on focus
        placeholder.addEventListener('focus', function() {
            if (this.querySelector('p')) {
                this.style.borderColor = '#917df1';
            }
        });
        
        placeholder.addEventListener('blur', function() {
            if (this.querySelector('p')) {
                this.style.borderColor = '#eaeaea';
            }
        });
    });
    
    // Load saved content from HTML first (100% reliable)
    loadSavedContentFromHTML();
    
    // Initialize IndexedDB and try to recover any lost data
    initIndexedDB().then(() => {
        // First try to recover from IndexedDB (in case HTML was lost)
        recoverLostData().then(() => {
            // Then load from IndexedDB as backup
            loadAllSavedImages();
        });
    }).catch(error => {
        console.error('Failed to initialize IndexedDB:', error);
        // Don't show alert - HTML-based saving is primary method
    });
    
    // Add keyboard shortcut for manual save (Ctrl+S / Cmd+S)
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            downloadSavedHTML();
        }
    });
});

// Load all saved images from IndexedDB (backup - HTML is primary)
async function loadAllSavedImages() {
    // Initialize IndexedDB first
    try {
        await initIndexedDB();
    } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        return;
    }
    
    // Load images for all containers that don't already have images from HTML
    const loadPromises = Array.from(document.querySelectorAll('.assessment-image-container')).map(async (container) => {
        // Skip if already has image from HTML data attribute
        if (container.getAttribute('data-image-src') || container.querySelector('img[data-saved-image="true"]')) {
            return;
        }
        
        const assessmentItem = container.closest('.assessment-item');
        if (!assessmentItem) return;
        
        // Try to get imageId from placeholder or existing image
        const placeholder = container.querySelector('.assessment-image-placeholder');
        const existingImg = container.querySelector('img');
        
        // Create a temporary placeholder if none exists to get the ID
        let tempPlaceholder = placeholder;
        if (!tempPlaceholder && !existingImg) {
            // Create a temporary element to get the ID
            const temp = document.createElement('div');
            temp.className = 'assessment-image-placeholder';
            container.appendChild(temp);
            tempPlaceholder = temp;
        }
        
        if (tempPlaceholder) {
            const imageId = getAssessmentItemId(tempPlaceholder);
            try {
                const savedImage = await loadImageFromStorage(imageId);
                
                if (savedImage) {
                    // Replace placeholder or existing content with saved image
                    const img = document.createElement('img');
                    img.src = savedImage;
                    img.alt = 'Assessment image';
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    img.style.borderRadius = '4px';
                    img.setAttribute('data-saved-image', 'true');
                    
                    container.innerHTML = '';
                    container.appendChild(img);
                    container.setAttribute('data-image-src', savedImage);
                    
                    // Images are visible by default, ensure container is not hidden
                    container.classList.remove('hidden');
                    
                    // Update toggle button if it exists
                    const toggleBtn = assessmentItem.querySelector('.image-toggle-btn');
                    if (toggleBtn) {
                        toggleBtn.textContent = '✕';
                        toggleBtn.classList.add('active');
                    }
                } else if (tempPlaceholder && !placeholder) {
                    // Remove temporary placeholder if no saved image
                    container.removeChild(tempPlaceholder);
                }
            } catch (error) {
                console.error(`Error loading image ${imageId}:`, error);
            }
        } else if (existingImg) {
            // If image already exists, save it to ensure it's persisted
            const imageId = getAssessmentItemIdFromContainer(container);
            if (imageId && existingImg.src && existingImg.src.startsWith('data:')) {
                try {
                    container.setAttribute('data-image-src', existingImg.src);
                    await saveImageToStorage(imageId, existingImg.src);
                } catch (error) {
                    console.error(`Error saving existing image ${imageId}:`, error);
                }
            }
        }
    });
    
    await Promise.all(loadPromises);
}

// Get image ID from container when image already exists
function getAssessmentItemIdFromContainer(container) {
    const assessmentItem = container.closest('.assessment-item');
    if (!assessmentItem) return null;
    
    const pageCard = assessmentItem.closest('.page-assessment-card');
    const breakpointAssessment = assessmentItem.closest('.breakpoint-assessment');
    const category = assessmentItem.closest('.critical, .friction, .opportunity');
    
    const page = pageCard?.getAttribute('data-page') || 'unknown';
    const breakpoint = breakpointAssessment?.getAttribute('data-breakpoint') || 'unknown';
    const categoryName = category?.className.includes('critical') ? 'critical' : 
                        category?.className.includes('friction') ? 'friction' : 'opportunity';
    
    // Get the index of this item in its list
    const listItems = category ? Array.from(category.querySelectorAll('.assessment-item')) : [];
    const index = listItems.indexOf(assessmentItem);
    
    return `${page}-${breakpoint}-${categoryName}-${index}`;
}

// Helper function to add a new assessment point
// Usage: addAssessmentPoint('critical', 'home', '1920x1080', 'Your point text here')
function addAssessmentPoint(category, page, breakpoint, text) {
    const pageCard = document.querySelector(`[data-page="${page}"]`);
    if (!pageCard) {
        console.error(`Page "${page}" not found`);
        return;
    }
    
    const assessment = pageCard.querySelector(`.breakpoint-assessment[data-breakpoint="${breakpoint}"]`);
    if (!assessment) {
        console.error(`Breakpoint "${breakpoint}" not found for page "${page}"`);
        return;
    }
    
    const categoryDiv = assessment.querySelector(`.${category}`);
    if (!categoryDiv) {
        console.error(`Category "${category}" not found`);
        return;
    }
    
    const ul = categoryDiv.querySelector('ul');
    if (!ul) {
        console.error('List not found');
        return;
    }
    
    // Split text into title and description if it contains " - "
    let title = text;
    let description = '';
    if (text.includes(' - ')) {
        const parts = text.split(' - ', 2);
        title = parts[0].trim();
        description = parts[1].trim();
    }
    
    const li = document.createElement('li');
    li.innerHTML = `
        <div class="assessment-item">
            <div class="assessment-item-text">
                <span>
                    <span class="assessment-title">${title}</span>
                    ${description ? `<span class="assessment-description">${description}</span>` : ''}
                </span>
                <button class="image-toggle-btn" onclick="toggleImage(this)">✕</button>
            </div>
            <div class="assessment-image-container">
                <div class="assessment-image-placeholder" tabindex="0">
                    <p>📋 Paste image here (Ctrl+V / Cmd+V)</p>
                    <p style="font-size: 0.75em; margin-top: 4px; color: #7f7f80;">Click this box, then paste your image</p>
                </div>
            </div>
        </div>
    `;
    
    ul.appendChild(li);
    
    // Set up paste handler for the new placeholder
    const placeholder = li.querySelector('.assessment-image-placeholder');
    if (placeholder) {
        placeholder.addEventListener('click', function() {
            this.focus();
        });
        placeholder.addEventListener('paste', function(e) {
            handleImagePaste(e, this);
        });
        placeholder.addEventListener('focus', function() {
            if (this.querySelector('p')) {
                this.style.borderColor = '#917df1';
            }
        });
        placeholder.addEventListener('blur', function() {
            if (this.querySelector('p')) {
                this.style.borderColor = '#eaeaea';
            }
        });
    }
    
    return li;
}

// Utility function to remove a specific image
// Usage: removeImage('home-1920x1080-opportunity-0')
async function removeImage(imageId) {
    try {
        if (!db) {
            await initIndexedDB();
        }
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        await store.delete(imageId);
        console.log(`Image ${imageId} removed successfully`);
        // Reload the page to refresh the display
        location.reload();
    } catch (error) {
        console.error('Error removing image:', error);
    }
}

// Utility function to remove all images
// Usage: removeAllImages()
async function removeAllImages() {
    try {
        if (!db) {
            await initIndexedDB();
        }
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        await store.clear();
        console.log('All images removed successfully');
        // Reload the page to refresh the display
        location.reload();
    } catch (error) {
        console.error('Error removing images:', error);
    }
}

// Export function to save HTML with all images embedded (optional utility)
function exportReviewWithImages() {
    // This would create a downloadable HTML file with all images embedded
    // Images are already embedded as data URLs, so the HTML is self-contained
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mr-vitamins-review-export.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Get unique ID for suggested improvement storage
function getSuggestedImprovementId(assessmentItem) {
    const pageCard = assessmentItem.closest('.page-assessment-card');
    const breakpointAssessment = assessmentItem.closest('.breakpoint-assessment');
    const category = assessmentItem.closest('.critical, .friction, .opportunity');
    const itemIndex = Array.from(category.querySelectorAll('.assessment-item')).indexOf(assessmentItem);
    
    if (pageCard && breakpointAssessment && category) {
        const pageName = pageCard.getAttribute('data-page') || 'unknown';
        const breakpoint = breakpointAssessment.getAttribute('data-breakpoint') || 'unknown';
        const categoryName = category.classList.contains('critical') ? 'critical' : 
                           category.classList.contains('friction') ? 'friction' : 'opportunity';
        return `${pageName}-${breakpoint}-${categoryName}-${itemIndex}-suggestion`;
    }
    return null;
}

// Save suggested improvement to IndexedDB
async function saveSuggestedImprovement(itemId, content, priority, effort) {
    try {
        if (!db) {
            await initIndexedDB();
        }
        const transaction = db.transaction(['suggestions'], 'readwrite');
        const store = transaction.objectStore('suggestions');
        await store.put({ id: itemId, content: content || '', priority: priority || null, effort: effort || null });
    } catch (error) {
        console.error('Error saving suggested improvement:', error);
    }
}

// Load suggested improvement from IndexedDB
async function loadSuggestedImprovement(itemId) {
    try {
        if (!db) {
            await initIndexedDB();
        }
        const transaction = db.transaction(['suggestions'], 'readonly');
        const store = transaction.objectStore('suggestions');
        const request = store.get(itemId);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                if (request.result) {
                    resolve({
                        content: request.result.content || null,
                        priority: request.result.priority || null,
                        effort: request.result.effort || null
                    });
                } else {
                    resolve({ content: null, priority: null, effort: null });
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error loading suggested improvement:', error);
        return { content: null, priority: null, effort: null };
    }
}

// Set priority for a suggested improvement
function setPriority(button) {
    const priorityBox = button.closest('.suggested-improvement-box');
    const assessmentItem = priorityBox.closest('.assessment-item');
    
    // Remove active class from all priority buttons in this box
    priorityBox.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Save priority, effort, and content
    const priority = button.getAttribute('data-priority');
    const contentBox = priorityBox.querySelector('.suggested-improvement-content');
    const content = contentBox ? contentBox.textContent.trim() : '';
    const effortBtn = priorityBox.querySelector('.effort-btn.active');
    const effort = effortBtn ? effortBtn.getAttribute('data-effort') : null;
    
    // CRITICAL: Save directly to HTML for 100% persistence
    if (contentBox) {
        contentBox.setAttribute('data-saved-priority', priority);
        if (effort) {
            contentBox.setAttribute('data-saved-effort', effort);
        }
    }
    
    // Also save to IndexedDB as backup
    if (assessmentItem) {
        const itemId = getSuggestedImprovementId(assessmentItem);
        if (itemId) {
            saveSuggestedImprovement(itemId, content, priority, effort);
        }
    }
    
    // Auto-save HTML immediately
    autoSaveHTML();
}

// Set effort for a suggested improvement
function setEffort(button) {
    const priorityBox = button.closest('.suggested-improvement-box');
    const assessmentItem = priorityBox.closest('.assessment-item');
    
    // Remove active class from all effort buttons in this box
    priorityBox.querySelectorAll('.effort-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Save priority, effort, and content
    const effort = button.getAttribute('data-effort');
    const contentBox = priorityBox.querySelector('.suggested-improvement-content');
    const content = contentBox ? contentBox.textContent.trim() : '';
    const priorityBtn = priorityBox.querySelector('.priority-btn.active');
    const priority = priorityBtn ? priorityBtn.getAttribute('data-priority') : null;
    
    // CRITICAL: Save directly to HTML for 100% persistence
    if (contentBox) {
        contentBox.setAttribute('data-saved-effort', effort);
        if (priority) {
            contentBox.setAttribute('data-saved-priority', priority);
        }
    }
    
    // Also save to IndexedDB as backup
    if (assessmentItem) {
        const itemId = getSuggestedImprovementId(assessmentItem);
        if (itemId) {
            saveSuggestedImprovement(itemId, content, priority, effort);
        }
    }
    
    // Auto-save HTML immediately
    autoSaveHTML();
}

// Hide empty assessment sections
function hideEmptySections() {
    const sections = document.querySelectorAll('.critical, .friction, .opportunity');
    sections.forEach(section => {
        const ul = section.querySelector('ul');
        if (ul) {
            // Check if ul has no li children (only comments or empty)
            const hasItems = ul.querySelectorAll('li').length > 0;
            if (!hasItems) {
                section.style.display = 'none';
            } else {
                section.style.display = ''; // Reset if it has items
            }
        }
    });
}

// Save image to file in images folder (downloads file for user to save)
function saveImageToFile(imageId, imageDataUrl) {
    try {
        // Convert data URL to blob
        const byteString = atob(imageDataUrl.split(',')[1]);
        const mimeString = imageDataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessment-${imageId}.png`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Image ${imageId} saved to file`);
    } catch (error) {
        console.error('Error saving image to file:', error);
        // Don't show alert - this is optional functionality
    }
}

// Auto-save HTML with all embedded data
let autoSaveTimeout = null;
function autoSaveHTML() {
    // Debounce auto-save to avoid too frequent saves
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    autoSaveTimeout = setTimeout(() => {
        try {
            // Update all image containers with saved data
            document.querySelectorAll('.assessment-image-container').forEach(container => {
                const img = container.querySelector('img');
                if (img && img.src && img.src.startsWith('data:')) {
                    container.setAttribute('data-image-src', img.src);
                }
            });
            
            // Update all suggested improvement content
            document.querySelectorAll('.suggested-improvement-content').forEach(contentBox => {
                const text = contentBox.textContent.trim();
                if (text) {
                    contentBox.setAttribute('data-saved-content', text);
                }
                
                const priorityBox = contentBox.closest('.suggested-improvement-box');
                const activePriorityBtn = priorityBox.querySelector('.priority-btn.active');
                const activeEffortBtn = priorityBox.querySelector('.effort-btn.active');
                
                if (activePriorityBtn) {
                    contentBox.setAttribute('data-saved-priority', activePriorityBtn.getAttribute('data-priority'));
                }
                if (activeEffortBtn) {
                    contentBox.setAttribute('data-saved-effort', activeEffortBtn.getAttribute('data-effort'));
                }
            });
            
            // Create downloadable HTML file
            const htmlContent = document.documentElement.outerHTML;
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            // Store download URL for manual save
            window.lastAutoSaveURL = url;
            window.lastAutoSaveBlob = blob;
            
            console.log('HTML auto-saved (ready for download)');
            
            // Show notification
            showSaveNotification();
        } catch (error) {
            console.error('Error auto-saving HTML:', error);
        }
    }, 2000); // Wait 2 seconds after last change
}

// Show save notification
function showSaveNotification() {
    // Remove existing notification if any
    const existing = document.getElementById('save-notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'save-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    notification.innerHTML = `
        <span>✓ Auto-saved</span>
        <button onclick="downloadSavedHTML()" style="background: white; color: #4CAF50; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Download HTML</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Download saved HTML (global function for button)
window.downloadSavedHTML = function() {
    if (window.lastAutoSaveBlob) {
        const url = URL.createObjectURL(window.lastAutoSaveBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mr-vitamins-review-saved.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        // Generate fresh HTML
        autoSaveHTML();
        setTimeout(() => {
            if (window.lastAutoSaveBlob) {
                window.downloadSavedHTML();
            }
        }, 100);
    }
};

// Load saved content from HTML data attributes on page load
function loadSavedContentFromHTML() {
    // Load images from data attributes
    document.querySelectorAll('.assessment-image-container[data-image-src]').forEach(container => {
        const imageSrc = container.getAttribute('data-image-src');
        if (imageSrc && !container.querySelector('img')) {
            const img = document.createElement('img');
            img.src = imageSrc;
            img.alt = 'Assessment image';
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.borderRadius = '4px';
            img.setAttribute('data-saved-image', 'true');
            container.innerHTML = '';
            container.appendChild(img);
            container.classList.remove('hidden');
            
            const toggleBtn = container.closest('.assessment-item')?.querySelector('.image-toggle-btn');
            if (toggleBtn) {
                toggleBtn.classList.add('active');
                toggleBtn.textContent = '✕';
            }
        }
    });
    
    // Load suggested improvements from data attributes
    document.querySelectorAll('.suggested-improvement-content[data-saved-content]').forEach(contentBox => {
        const savedContent = contentBox.getAttribute('data-saved-content');
        if (savedContent && !contentBox.textContent.trim()) {
            contentBox.textContent = savedContent;
        }
        
        const savedPriority = contentBox.getAttribute('data-saved-priority');
        if (savedPriority) {
            const priorityBox = contentBox.closest('.suggested-improvement-box');
            const priorityBtn = priorityBox.querySelector(`.priority-btn[data-priority="${savedPriority}"]`);
            if (priorityBtn) {
                priorityBtn.classList.add('active');
            }
        }
        
        const savedEffort = contentBox.getAttribute('data-saved-effort');
        if (savedEffort) {
            const priorityBox = contentBox.closest('.suggested-improvement-box');
            const effortBtn = priorityBox.querySelector(`.effort-btn[data-effort="${savedEffort}"]`);
            if (effortBtn) {
                effortBtn.classList.add('active');
            }
        }
    });
}

// Recovery function: Try to restore from IndexedDB if HTML doesn't have data (global function for button)
window.recoverLostData = async function() {
    console.log('Attempting to recover lost data from IndexedDB...');
    
    try {
        await initIndexedDB();
        
        // Recover images
        const imageContainers = document.querySelectorAll('.assessment-image-container');
        for (const container of imageContainers) {
            // Skip if already has image from HTML
            if (container.getAttribute('data-image-src') || container.querySelector('img')) {
                continue;
            }
            
            const placeholder = container.querySelector('.assessment-image-placeholder');
            if (placeholder) {
                const imageId = getAssessmentItemId(placeholder);
                const savedImage = await loadImageFromStorage(imageId);
                
                if (savedImage) {
                    const img = document.createElement('img');
                    img.src = savedImage;
                    img.alt = 'Assessment image';
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    img.style.borderRadius = '4px';
                    img.setAttribute('data-saved-image', 'true');
                    
                    container.innerHTML = '';
                    container.appendChild(img);
                    container.setAttribute('data-image-src', savedImage);
                    container.classList.remove('hidden');
                    
                    const toggleBtn = container.closest('.assessment-item')?.querySelector('.image-toggle-btn');
                    if (toggleBtn) {
                        toggleBtn.classList.add('active');
                        toggleBtn.textContent = '✕';
                    }
                    
                    console.log(`Recovered image: ${imageId}`);
                }
            }
        }
        
        // Recover suggested improvements
        const contentBoxes = document.querySelectorAll('.suggested-improvement-content');
        for (const contentBox of contentBoxes) {
            // Skip if already has content from HTML
            if (contentBox.getAttribute('data-saved-content') || contentBox.textContent.trim()) {
                continue;
            }
            
            const assessmentItem = contentBox.closest('.assessment-item');
            if (assessmentItem) {
                const itemId = getSuggestedImprovementId(assessmentItem);
                if (itemId) {
                    const savedData = await loadSuggestedImprovement(itemId);
                    if (savedData && savedData.content) {
                        contentBox.textContent = savedData.content;
                        contentBox.setAttribute('data-saved-content', savedData.content);
                        
                        const priorityBox = contentBox.closest('.suggested-improvement-box');
                        if (savedData.priority) {
                            const priorityBtn = priorityBox.querySelector(`.priority-btn[data-priority="${savedData.priority}"]`);
                            if (priorityBtn) {
                                priorityBtn.classList.add('active');
                            }
                            contentBox.setAttribute('data-saved-priority', savedData.priority);
                        }
                        if (savedData.effort) {
                            const effortBtn = priorityBox.querySelector(`.effort-btn[data-effort="${savedData.effort}"]`);
                            if (effortBtn) {
                                effortBtn.classList.add('active');
                            }
                            contentBox.setAttribute('data-saved-effort', savedData.effort);
                        }
                        
                        console.log(`Recovered suggestion: ${itemId}`);
                    }
                }
            }
        }
        
        // Auto-save recovered data to HTML
        autoSaveHTML();
        
        console.log('Data recovery complete');
        
        // Show success message
        alert('Data recovery complete! Check the page for restored images and text. Click "Download Saved HTML" to save the recovered data.');
    } catch (error) {
        console.error('Error recovering data:', error);
        alert('Error recovering data. Please check the console for details.');
    }
};

// COMPREHENSIVE EXPORT: Extract ALL data from IndexedDB and embed into HTML
window.exportAllDataToHTML = async function() {
    console.log('Starting comprehensive data export...');
    
    try {
        await initIndexedDB();
        
        let recoveredCount = 0;
        
        // Step 1: Recover and embed ALL images from IndexedDB
        const imageContainers = document.querySelectorAll('.assessment-image-container');
        for (const container of imageContainers) {
            const placeholder = container.querySelector('.assessment-image-placeholder');
            if (placeholder) {
                const imageId = getAssessmentItemId(placeholder);
                const savedImage = await loadImageFromStorage(imageId);
                
                if (savedImage) {
                    // Update container with data attribute
                    container.setAttribute('data-image-src', savedImage);
                    
                    // If no image displayed, create one
                    if (!container.querySelector('img')) {
                        const img = document.createElement('img');
                        img.src = savedImage;
                        img.alt = 'Assessment image';
                        img.style.width = '100%';
                        img.style.height = 'auto';
                        img.style.display = 'block';
                        img.style.borderRadius = '4px';
                        img.setAttribute('data-saved-image', 'true');
                        
                        container.innerHTML = '';
                        container.appendChild(img);
                        container.classList.remove('hidden');
                        
                        const toggleBtn = container.closest('.assessment-item')?.querySelector('.image-toggle-btn');
                        if (toggleBtn) {
                            toggleBtn.classList.add('active');
                            toggleBtn.textContent = '✕';
                        }
                    } else {
                        // Update existing image
                        const img = container.querySelector('img');
                        img.src = savedImage;
                        img.setAttribute('data-saved-image', 'true');
                        container.setAttribute('data-image-src', savedImage);
                    }
                    
                    recoveredCount++;
                    console.log(`✓ Embedded image: ${imageId}`);
                }
            }
        }
        
        // Step 2: Recover and embed ALL suggested improvements from IndexedDB
        const contentBoxes = document.querySelectorAll('.suggested-improvement-content');
        for (const contentBox of contentBoxes) {
            const assessmentItem = contentBox.closest('.assessment-item');
            if (assessmentItem) {
                const itemId = getSuggestedImprovementId(assessmentItem);
                if (itemId) {
                    const savedData = await loadSuggestedImprovement(itemId);
                    if (savedData) {
                        // Update content
                        if (savedData.content && savedData.content.trim()) {
                            contentBox.textContent = savedData.content;
                            contentBox.setAttribute('data-saved-content', savedData.content);
                        }
                        
                        // Update priority
                        const priorityBox = contentBox.closest('.suggested-improvement-box');
                        if (savedData.priority) {
                            const priorityBtn = priorityBox.querySelector(`.priority-btn[data-priority="${savedData.priority}"]`);
                            if (priorityBtn) {
                                priorityBtn.classList.add('active');
                            }
                            contentBox.setAttribute('data-saved-priority', savedData.priority);
                        }
                        
                        // Update effort
                        if (savedData.effort) {
                            const effortBtn = priorityBox.querySelector(`.effort-btn[data-effort="${savedData.effort}"]`);
                            if (effortBtn) {
                                effortBtn.classList.add('active');
                            }
                            contentBox.setAttribute('data-saved-effort', savedData.effort);
                        }
                        
                        if (savedData.content || savedData.priority || savedData.effort) {
                            recoveredCount++;
                            console.log(`✓ Embedded suggestion: ${itemId}`);
                        }
                    }
                }
            }
        }
        
        // Step 3: Ensure all displayed images have data attributes
        document.querySelectorAll('.assessment-image-container img').forEach(img => {
            if (img.src && img.src.startsWith('data:') && !img.closest('.assessment-image-container').getAttribute('data-image-src')) {
                const container = img.closest('.assessment-image-container');
                container.setAttribute('data-image-src', img.src);
                img.setAttribute('data-saved-image', 'true');
            }
        });
        
        // Step 4: Ensure all displayed text has data attributes
        document.querySelectorAll('.suggested-improvement-content').forEach(contentBox => {
            const text = contentBox.textContent.trim();
            if (text && !contentBox.getAttribute('data-saved-content')) {
                contentBox.setAttribute('data-saved-content', text);
            }
            
            const priorityBox = contentBox.closest('.suggested-improvement-box');
            const activePriorityBtn = priorityBox.querySelector('.priority-btn.active');
            const activeEffortBtn = priorityBox.querySelector('.effort-btn.active');
            
            if (activePriorityBtn && !contentBox.getAttribute('data-saved-priority')) {
                contentBox.setAttribute('data-saved-priority', activePriorityBtn.getAttribute('data-priority'));
            }
            if (activeEffortBtn && !contentBox.getAttribute('data-saved-effort')) {
                contentBox.setAttribute('data-saved-effort', activeEffortBtn.getAttribute('data-effort'));
            }
        });
        
        // Step 5: Generate complete HTML with all data embedded
        const htmlContent = document.documentElement.outerHTML;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Create download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mr-vitamins-review-complete.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`✅ Export complete! Embedded ${recoveredCount} items from IndexedDB into HTML.`);
        alert(`✅ Export complete!\n\nEmbedded ${recoveredCount} items (images and text) from IndexedDB into the HTML file.\n\nThe file "mr-vitamins-review-complete.html" has been downloaded.\n\nReplace your index.html with this file to keep all your work!`);
        
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error exporting data. Please check the console for details.');
    }
};

