// Breakpoint switching functionality
function switchBreakpoint(button, pageName) {
    // Get the breakpoint value from the clicked button
    const breakpoint = button.getAttribute('data-breakpoint');
    
    // Find the page assessment card for this page
    const pageCard = document.querySelector(`[data-page="${pageName}"]`);
    if (!pageCard) {
        console.error(`Page card not found for page: ${pageName}`);
        return;
    }
    
    // Update active state on all breakpoint badge buttons in this page
    const allBadges = pageCard.querySelectorAll('.breakpoint-badge');
    allBadges.forEach(badge => {
        badge.classList.remove('active');
    });
    button.classList.add('active');
    
    // Show/hide screenshot containers for this breakpoint
    const allScreenshots = pageCard.querySelectorAll('.screenshot-container');
    allScreenshots.forEach(container => {
        const containerBreakpoint = container.getAttribute('data-breakpoint');
        if (containerBreakpoint === breakpoint) {
            container.classList.add('active');
        } else {
            container.classList.remove('active');
        }
    });
    
    // Show/hide assessment content for this breakpoint
    const allAssessments = pageCard.querySelectorAll('.breakpoint-assessment');
    allAssessments.forEach(assessment => {
        const assessmentBreakpoint = assessment.getAttribute('data-breakpoint');
        if (assessmentBreakpoint === breakpoint) {
            assessment.classList.add('active');
        } else {
            assessment.classList.remove('active');
        }
    });
}

// Image toggle functionality
function toggleImage(button) {
    const assessmentItem = button.closest('.assessment-item');
    if (!assessmentItem) return;
    
    const imageContainer = assessmentItem.querySelector('.assessment-image-container');
    if (!imageContainer) return;
    
    const isActive = button.classList.contains('active');
    if (isActive) {
        button.classList.remove('active');
        imageContainer.style.display = 'none';
    } else {
        button.classList.add('active');
        imageContainer.style.display = 'block';
    }
}

// Priority setting functionality
function setPriority(button) {
    const prioritySection = button.closest('.improvement-priority-section');
    if (!prioritySection) return;
    
    const allPriorityButtons = prioritySection.querySelectorAll('.priority-btn');
    allPriorityButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('data-active');
    });
    
    button.classList.add('active');
    button.setAttribute('data-active', 'true');
    
    // Update the saved priority in the content div
    const improvementContent = button.closest('.suggested-improvement-box')
        .querySelector('.suggested-improvement-content');
    if (improvementContent) {
        const priority = button.getAttribute('data-priority');
        improvementContent.setAttribute('data-saved-priority', priority);
    }
}

// Effort setting functionality
function setEffort(button) {
    const effortSection = button.closest('.improvement-effort-section');
    if (!effortSection) return;
    
    const allEffortButtons = effortSection.querySelectorAll('.effort-btn');
    allEffortButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('data-active');
    });
    
    button.classList.add('active');
    button.setAttribute('data-active', 'true');
    
    // Update the saved effort in the content div
    const improvementContent = button.closest('.suggested-improvement-box')
        .querySelector('.suggested-improvement-content');
    if (improvementContent) {
        const effort = button.getAttribute('data-effort');
        improvementContent.setAttribute('data-saved-effort', effort);
    }
}

// Tab switching functionality
function showTab(tabName) {
    // Hide all tab contents
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Show the selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Update tab button states
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    const selectedTabButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (selectedTabButton) {
        selectedTabButton.classList.add('active');
    }
}
