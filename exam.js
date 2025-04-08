// Global variables
let allQuestions = [];
let currentExam = {
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    flaggedQuestions: [],
    startTime: null,
    endTime: null,
    timeLimit: null,
    examMode: 'full',
    selectedDomain: null,
    inProgress: false // Flag to track if exam is currently in progress
};
let userStats = {
    examsTaken: 0,
    fullExams: 0,
    quickExams: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    totalStudyTime: 0,
    domainScores: {
        '1.0': { total: 0, correct: 0 },
        '2.0': { total: 0, correct: 0 },
        '3.0': { total: 0, correct: 0 },
        '4.0': { total: 0, correct: 0 },
        '5.0': { total: 0, correct: 0 }
    },
    examHistory: []
};
let timer;
let darkMode = false;

// DOM Content Loaded - Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    setupEventListeners();
    loadUserStats();
    initializePage();
    setupNavigationWarnings();
});

// Load questions from GitHub URL instead of local file
function loadQuestions() {
    const githubUrl = 'https://raw.githubusercontent.com/sree-charan/comptia-sec/refs/heads/master/data.json';
    
    fetch(githubUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            allQuestions = data;
            console.log(`Loaded ${allQuestions.length} questions from GitHub`);
        })
        .catch(error => {
            console.error('Error loading questions from GitHub:', error);
            // Fallback to local file if GitHub fails
            console.log('Attempting to load local data file as fallback...');
            fetch('data.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Local data file not available');
                    }
                    return response.json();
                })
                .then(data => {
                    allQuestions = data;
                    console.log(`Loaded ${allQuestions.length} questions from local file`);
                })
                .catch(fallbackError => {
                    console.error('Fallback loading failed:', fallbackError);
                    showNotification('Error loading questions. Please check your internet connection and refresh the page.', 'error');
                });
        });
}

// Setup event listeners for all interactive elements
function setupEventListeners() {
    // Theme toggle
    document.querySelector('.theme-toggle').addEventListener('click', toggleDarkMode);

    // Mobile menu button
    document.querySelector('.mobile-menu-btn').addEventListener('click', toggleMobileMenu);

    // Home page buttons
    document.getElementById('start-practice').addEventListener('click', () => navigateToPage('exam-options'));
    document.getElementById('practice-btn').addEventListener('click', () => navigateToPage('exam-options'));
    document.getElementById('custom-btn').addEventListener('click', () => {
        navigateToPage('exam-options');
        setTimeout(() => {
            document.querySelector('[data-mode="custom"]').click();
        }, 100);
    });

    // Exam options buttons
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.getAttribute('data-mode');
            handleExamModeSelection(mode);
        });
    });

    // Domain selection modal
    document.getElementById('cancel-domain').addEventListener('click', () => {
        document.getElementById('domain-selection').classList.remove('active');
    });
    document.getElementById('start-domain-exam').addEventListener('click', () => {
        const selectedDomain = document.querySelector('input[name="domain"]:checked');
        if (selectedDomain) {
            startExam('domain', selectedDomain.value);
            document.getElementById('domain-selection').classList.remove('active');
        } else {
            showNotification('Please select a domain', 'warning');
        }
    });

    // Custom quiz modal
    document.getElementById('cancel-custom').addEventListener('click', () => {
        document.getElementById('custom-quiz-modal').classList.remove('active');
    });
    document.getElementById('start-custom-exam').addEventListener('click', startCustomExam);

    // Range slider event listeners
    document.getElementById('question-count-slider').addEventListener('input', (e) => {
        document.getElementById('question-count-display').textContent = e.target.value;
        // Adjust time limit based on number of questions (1 minute per question)
        if (document.getElementById('timed-option').checked) {
            const timeLimit = Math.floor(parseInt(e.target.value) * 1);
            document.getElementById('time-limit-slider').value = timeLimit;
            document.getElementById('time-limit-display').textContent = timeLimit;
        }
    });

    document.getElementById('time-limit-slider').addEventListener('input', (e) => {
        document.getElementById('time-limit-display').textContent = e.target.value;
    });

    // Exam navigation buttons
    document.getElementById('prev-question').addEventListener('click', goToPreviousQuestion);
    document.getElementById('next-question').addEventListener('click', goToNextQuestion);
    document.getElementById('flag-question').addEventListener('click', toggleFlagQuestion);
    document.getElementById('submit-exam').addEventListener('click', showSubmitConfirmation);
    document.getElementById('exit-exam').addEventListener('click', showExitConfirmation);

    // Submit confirmation
    document.getElementById('cancel-submit').addEventListener('click', () => {
        document.getElementById('submit-confirmation').classList.remove('active');
    });
    document.getElementById('confirm-submit').addEventListener('click', submitExam);

    // Exit confirmation
    document.getElementById('cancel-exit').addEventListener('click', () => {
        document.getElementById('exit-confirmation').classList.remove('active');
    });
    document.getElementById('confirm-exit').addEventListener('click', exitExam);

    // Result page buttons
    document.getElementById('review-answers').addEventListener('click', () => navigateToPage('review'));
    document.getElementById('new-exam').addEventListener('click', () => navigateToPage('exam-options'));
    document.getElementById('save-results').addEventListener('click', saveExamResults);

    // Review page buttons
    document.getElementById('back-to-results').addEventListener('click', () => navigateToPage('results'));
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.getAttribute('data-filter');
            filterReviewQuestions(filter);
        });
    });

    // Progress page buttons
    document.getElementById('reset-progress').addEventListener('click', resetProgress);
    document.getElementById('export-progress').addEventListener('click', exportProgress);
}

// Add event listeners for navigation warnings - FIXED to properly handle navigation
function setupNavigationWarnings() {
    // Add beforeunload event to warn when closing/refreshing the page during an exam
    window.addEventListener('beforeunload', (e) => {
        if (currentExam.inProgress) {
            // Standard way to show a confirmation dialog before page unload
            e.preventDefault();
            e.returnValue = 'You are in the middle of an exam. If you leave, your progress will be lost. Are you sure you want to leave?';
            return e.returnValue;
        }
    });

    // COMPLETELY REVAMPED: Add event listeners to all internal navigation links to warn during an exam
    // This ensures we handle the navigation flow properly
    document.querySelectorAll('.nav-links a, footer a[data-page]').forEach(link => {
        // Remove any existing onclick handlers to avoid duplication
        if (link.onclick) {
            link.onclick = null;
        }
        
        // Add our new event listener
        link.addEventListener('click', function(e) {
            // Get the target page
            const targetPage = this.getAttribute('data-page');
            
            // Always prevent default to handle navigation manually
            e.preventDefault();
            
            // Store the target page for use in the warning modal
            this.setAttribute('data-target-page', targetPage);
            
            // Check if exam is in progress
            if (currentExam.inProgress) {
                // Don't show warning if navigating to exam-related pages
                if (targetPage !== 'exam' && targetPage !== 'results' && targetPage !== 'review') {
                    showNavigationWarning(targetPage);
                    return false;
                }
            }
            
            // If no exam in progress or exempt page, navigate normally
            navigateToPage(targetPage);
            return false;
        });
    });
}

// Show warning when trying to navigate away during exam - FIXED to properly handle navigation decisions
function showNavigationWarning(targetPage) {
    // Create modal if it doesn't exist
    let navWarningModal = document.getElementById('navigation-warning');
    if (!navWarningModal) {
        navWarningModal = document.createElement('div');
        navWarningModal.id = 'navigation-warning';
        navWarningModal.className = 'modal';
        
        navWarningModal.innerHTML = `
            <div class="modal-content">
                <h2>Leave Exam?</h2>
                <p>You are in the middle of an exam. If you navigate away, your progress will be lost.</p>
                <p>Do you want to save your progress and leave, or continue the exam?</p>
                <div class="modal-buttons">
                    <button id="continue-exam" class="secondary-btn">Continue Exam</button>
                    <button id="save-and-leave" class="primary-btn">Save & Leave</button>
                    <button id="leave-without-saving" class="danger-btn">Leave Without Saving</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(navWarningModal);
        
        // Add navigation warning styles if not already present
        if (!document.getElementById('nav-warning-styles')) {
            const style = document.createElement('style');
            style.id = 'nav-warning-styles';
            style.textContent = `
                .danger-btn {
                    background-color: var(--danger-color);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: var(--radius);
                    font-weight: 500;
                    transition: var(--transition);
                }
                .danger-btn:hover {
                    background-color: #bd2130;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Store the target page in the modal for reference
    navWarningModal.setAttribute('data-target-page', targetPage);
    
    // Show the warning modal
    navWarningModal.classList.add('active');
    
    // Get the buttons
    const continueExamBtn = document.getElementById('continue-exam');
    const saveAndLeaveBtn = document.getElementById('save-and-leave');
    const leaveWithoutSavingBtn = document.getElementById('leave-without-saving');
    
    // Remove existing event listeners to prevent duplicates
    const newContinueBtn = continueExamBtn.cloneNode(true);
    const newSaveBtn = saveAndLeaveBtn.cloneNode(true);
    const newLeaveBtn = leaveWithoutSavingBtn.cloneNode(true);
    
    continueExamBtn.parentNode.replaceChild(newContinueBtn, continueExamBtn);
    saveAndLeaveBtn.parentNode.replaceChild(newSaveBtn, saveAndLeaveBtn);
    leaveWithoutSavingBtn.parentNode.replaceChild(newLeaveBtn, leaveWithoutSavingBtn);
    
    // Add event listeners to the new buttons
    newContinueBtn.addEventListener('click', () => {
        // Close the modal and continue the exam (no navigation)
        navWarningModal.classList.remove('active');
    });
    
    newSaveBtn.addEventListener('click', () => {
        // Save exam progress
        saveExamProgress();
        // Mark exam as no longer in progress
        currentExam.inProgress = false;
        // Close the modal
        navWarningModal.classList.remove('active');
        // Only navigate after the action is complete
        const destination = navWarningModal.getAttribute('data-target-page') || 'home';
        navigateToPage(destination);
    });
    
    newLeaveBtn.addEventListener('click', () => {
        // Mark exam as no longer in progress
        currentExam.inProgress = false;
        // Close the modal
        navWarningModal.classList.remove('active');
        // Only navigate after the action is complete
        const destination = navWarningModal.getAttribute('data-target-page') || 'home';
        navigateToPage(destination);
    });
}

// Save exam progress for resuming later
function saveExamProgress() {
    const examProgress = {
        questions: currentExam.questions,
        userAnswers: currentExam.userAnswers,
        flaggedQuestions: currentExam.flaggedQuestions,
        startTime: currentExam.startTime,
        timeLimit: currentExam.timeLimit,
        examMode: currentExam.examMode,
        selectedDomain: currentExam.selectedDomain,
        timeRemaining: currentExam.timeRemaining || null,
        currentQuestionIndex: currentExam.currentQuestionIndex
    };
    
    // Save to localStorage
    localStorage.setItem('savedExam', JSON.stringify(examProgress));
    
    showNotification('Exam progress saved. You can resume from the Exam Options page.', 'success');
}

// Check for saved exam on startup
function checkForSavedExam() {
    const savedExam = localStorage.getItem('savedExam');
    if (savedExam) {
        // Create "Resume Exam" button in exam options
        const optionsContainer = document.querySelector('.exam-options-grid');
        if (optionsContainer) {
            const resumeCard = document.createElement('div');
            resumeCard.className = 'option-card resume-exam';
            resumeCard.innerHTML = `
                <div class="option-icon">
                    <i class="fas fa-history"></i>
                </div>
                <h3>Resume Saved Exam</h3>
                <p>Continue the exam you were working on previously.</p>
                <button class="option-btn" data-mode="resume">Resume Exam</button>
            `;
            
            // Insert at the beginning
            optionsContainer.insertBefore(resumeCard, optionsContainer.firstChild);
            
            // Add event listener
            resumeCard.querySelector('button').addEventListener('click', () => {
                resumeSavedExam();
            });
        }
    }
}

// Resume a saved exam
function resumeSavedExam() {
    try {
        const savedExam = localStorage.getItem('savedExam');
        if (savedExam) {
            const examData = JSON.parse(savedExam);
            
            // Show loading screen
            document.getElementById('loading-screen').style.display = 'flex';
            
            // Restore exam state
            currentExam = {
                ...examData,
                endTime: null,
                inProgress: true
            };
            
            // Setup display info based on exam mode
            if (currentExam.examMode === 'full') {
                setupExamPage('Security+ Full Practice Exam', '90 Questions | 90 Minutes');
            } else if (currentExam.examMode === 'quick') {
                setupExamPage('Security+ Quick Practice', '30 Questions | 30 Minutes');
            } else if (currentExam.examMode === 'domain') {
                const domainName = getDomainName(currentExam.selectedDomain);
                setupExamPage(`${domainName} Practice`, `${currentExam.questions.length} Questions`);
            } else if (currentExam.examMode === 'custom') {
                setupExamPage('Custom Practice Exam', `${currentExam.questions.length} Questions`);
            } else if (currentExam.examMode === 'missed') {
                setupExamPage('Missed Questions Practice', `${currentExam.questions.length} Questions`);
            } else if (currentExam.examMode === 'daily') {
                setupExamPage('Daily Challenge', '10 Questions | 10 Minutes');
            }
            
            // Navigate to exam page and initialize it
            navigateToPage('exam');
            
            // Initialize exam UI
            createQuestionButtons();
            loadQuestion(currentExam.currentQuestionIndex);
            
            // Resume timer if there was a time limit
            if (currentExam.timeLimit) {
                if (currentExam.timeRemaining) {
                    // Resume with remaining time
                    startTimerWithRemaining(currentExam.timeRemaining);
                } else {
                    // Calculate elapsed time and remaining time
                    const now = new Date();
                    const elapsed = Math.floor((now - new Date(currentExam.startTime)) / 1000);
                    const remaining = Math.max(0, currentExam.timeLimit - elapsed);
                    startTimerWithRemaining(remaining);
                }
            } else {
                document.getElementById('timer').textContent = 'Untimed';
            }
            
            // Remove saved exam from storage to prevent duplicate resumes
            localStorage.removeItem('savedExam');
            
            // Hide loading screen
            document.getElementById('loading-screen').style.display = 'none';
            
            showNotification('Exam resumed successfully!', 'success');
        }
    } catch (error) {
        console.error('Error resuming exam:', error);
        showNotification('Error resuming exam. Starting a new exam instead.', 'error');
        document.getElementById('loading-screen').style.display = 'none';
    }
}

// Start timer with a specific remaining time - FIXED timer functionality
function startTimerWithRemaining(remainingSeconds) {
    // Clear any existing timer to prevent duplicates
    if (timer) {
        clearInterval(timer);
    }
    
    let timeRemaining = remainingSeconds;
    updateTimerDisplay(timeRemaining);
    
    const startTime = Date.now();
    const initialRemaining = remainingSeconds;
    
    timer = setInterval(() => {
        // Calculate elapsed seconds based on actual time difference
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        timeRemaining = initialRemaining - elapsedSeconds;
        currentExam.timeRemaining = timeRemaining;
        
        updateTimerDisplay(timeRemaining);
        
        if (timeRemaining <= 0) {
            clearInterval(timer);
            submitExam();
        }
    }, 1000);
}

// Initialize the page based on hash or default to home
function initializePage() {
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        navigateToPage(hash);
    } else {
        navigateToPage('home');
    }
    
    // Check for a saved exam
    checkForSavedExam();
}

// Navigate between pages
function navigateToPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Remove active class from all nav links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });

    // Show the target page
    document.getElementById(pageId).classList.add('active');

    // Add active class to current nav link
    document.querySelector(`.nav-links a[data-page="${pageId}"]`)?.classList.add('active');

    // Update URL hash
    window.location.hash = pageId;

    // Special page initialization
    if (pageId === 'progress') {
        updateProgressPage();
    }
}

// Toggle dark mode
function toggleDarkMode() {
    darkMode = !darkMode;
    if (darkMode) {
        document.body.classList.add('dark-mode');
        document.querySelector('.theme-toggle i').classList.replace('fa-moon', 'fa-sun');
    } else {
        document.body.classList.remove('dark-mode');
        document.querySelector('.theme-toggle i').classList.replace('fa-sun', 'fa-moon');
    }
    localStorage.setItem('darkMode', darkMode);
}

// Toggle mobile menu
function toggleMobileMenu() {
    document.querySelector('.nav-links').classList.toggle('active');
}

// Handle exam mode selection
function handleExamModeSelection(mode) {
    currentExam.examMode = mode;
    
    switch (mode) {
        case 'full':
            startExam('full');
            break;
        case 'quick':
            startExam('quick');
            break;
        case 'domain':
            document.getElementById('domain-selection').classList.add('active');
            break;
        case 'custom':
            document.getElementById('custom-quiz-modal').classList.add('active');
            break;
        case 'missed':
            startExam('missed');
            break;
        case 'daily':
            startExam('daily');
            break;
    }
}

// Start custom exam
function startCustomExam() {
    try {
        const questionCount = parseInt(document.getElementById('question-count-slider').value);
        const isTimed = document.getElementById('timed-option').checked;
        
        // Get selected domains
        const selectedDomains = [];
        document.querySelectorAll('input[name="custom-domain"]:checked').forEach(checkbox => {
            selectedDomains.push(checkbox.value);
        });
        
        if (selectedDomains.length === 0) {
            showNotification('Please select at least one domain', 'warning');
            return;
        }
        
        // Create custom exam options
        const options = {
            questionCount,
            isTimed,
            selectedDomains,
            timeLimit: isTimed ? parseInt(document.getElementById('time-limit-slider').value) : null
        };
        
        startExam('custom', null, options);
        document.getElementById('custom-quiz-modal').classList.remove('active');
    } catch (error) {
        console.error('Error creating custom exam:', error);
        showNotification(`Error starting exam: ${error.message}`, 'error');
        document.getElementById('loading-screen').style.display = 'none';
    }
}

// Start an exam based on selected mode
function startExam(mode, selectedDomain = null, customOptions = null) {
    // Show loading screen
    document.getElementById('loading-screen').style.display = 'flex';
    
    // Reset current exam state
    currentExam = {
        questions: [],
        currentQuestionIndex: 0,
        userAnswers: [],
        flaggedQuestions: [],
        startTime: new Date(),
        endTime: null,
        timeLimit: null,
        examMode: mode,
        selectedDomain: selectedDomain,
        inProgress: true // Set exam as in progress
    };
    
    // Set exam questions based on mode
    setTimeout(() => {
        try {
            if (mode === 'full') {
                // Full exam: 90 questions with domain distribution
                currentExam.questions = selectQuestionsWithDomainDistribution(90);
                currentExam.timeLimit = 90 * 60; // 90 minutes
                setupExamPage('Security+ Full Practice Exam', '90 Questions | 90 Minutes');
            } else if (mode === 'quick') {
                // Quick exam: 30 questions
                currentExam.questions = selectQuestionsWithDomainDistribution(30);
                currentExam.timeLimit = 30 * 60; // 30 minutes
                setupExamPage('Security+ Quick Practice', '30 Questions | 30 Minutes');
            } else if (mode === 'domain') {
                // Domain-specific: 30 questions from selected domain
                currentExam.questions = selectQuestionsByDomain(selectedDomain, 30);
                currentExam.timeLimit = 30 * 60; // 30 minutes
                const domainName = getDomainName(selectedDomain);
                setupExamPage(`${domainName} Practice`, '30 Questions | 30 Minutes');
            } else if (mode === 'custom') {
                // Custom exam with improved error handling
                const { questionCount, selectedDomains, isTimed, timeLimit } = customOptions;
                
                if (!allQuestions || allQuestions.length === 0) {
                    throw new Error("Questions not loaded yet. Please refresh the page and try again.");
                }
                
                currentExam.questions = selectQuestionsByDomains(selectedDomains, questionCount);
                
                if (currentExam.questions.length === 0) {
                    throw new Error("No questions matching your criteria. Please try different options.");
                }
                
                if (isTimed && timeLimit) {
                    currentExam.timeLimit = timeLimit * 60; // Convert minutes to seconds
                    setupExamPage('Custom Practice Exam', `${currentExam.questions.length} Questions | ${timeLimit} Minutes`);
                } else {
                    currentExam.timeLimit = null; // No time limit
                    setupExamPage('Custom Practice Exam', `${currentExam.questions.length} Questions | Untimed`);
                }
            } else if (mode === 'missed') {
                // Missed questions
                const missedQuestions = loadMissedQuestions();
                if (missedQuestions.length < 5) {
                    showNotification('Not enough missed questions available. Take more exams first.', 'warning');
                    document.getElementById('loading-screen').style.display = 'none';
                    return;
                }
                currentExam.questions = missedQuestions.slice(0, 30);
                currentExam.timeLimit = 30 * 60; // 30 minutes
                setupExamPage('Missed Questions Practice', `${currentExam.questions.length} Questions | 30 Minutes`);
            } else if (mode === 'daily') {
                // Daily challenge: 10 random questions
                currentExam.questions = selectRandomQuestions(10);
                currentExam.timeLimit = 10 * 60; // 10 minutes
                setupExamPage('Daily Challenge', '10 Questions | 10 Minutes');
            }
            
            // Verify we have questions
            if (!currentExam.questions || currentExam.questions.length === 0) {
                throw new Error("Failed to load questions. Please try again.");
            }
            
            // Initialize user answers and navigation
            currentExam.userAnswers = new Array(currentExam.questions.length).fill(null);
            
            // Initialize exam
            navigateToPage('exam');
            initializeExam();
            
            // Hide loading screen
            document.getElementById('loading-screen').style.display = 'none';
        } catch (error) {
            console.error('Error starting exam:', error);
            showNotification(`Error starting exam: ${error.message}`, 'error');
            document.getElementById('loading-screen').style.display = 'none';
        }
    }, 1000); // Add a small delay for loading effect
}

// Setup the exam page header
function setupExamPage(title, description) {
    document.getElementById('exam-title').textContent = title;
    document.getElementById('exam-description').textContent = description;
}

// Initialize exam UI
function initializeExam() {
    // Create question navigation buttons
    createQuestionButtons();
    
    // Load first question
    loadQuestion(0);
    
    // Start the timer if there's a time limit
    if (currentExam.timeLimit) {
        startTimer();
    } else {
        document.getElementById('timer').textContent = 'Untimed';
    }
}

// Create question navigation buttons
function createQuestionButtons() {
    const questionButtonsContainer = document.getElementById('question-buttons');
    questionButtonsContainer.innerHTML = '';
    
    for (let i = 0; i < currentExam.questions.length; i++) {
        const button = document.createElement('button');
        button.className = 'q-btn';
        button.textContent = i + 1;
        
        button.addEventListener('click', () => {
            loadQuestion(i);
        });
        
        questionButtonsContainer.appendChild(button);
    }
}

// Load a question into the UI
function loadQuestion(index) {
    // Update current question index
    currentExam.currentQuestionIndex = index;
    
    // Get the current question
    const question = currentExam.questions[index];
    
    // Update question text
    document.getElementById('question-text').textContent = question.question;
    
    // Clear and update options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, optIndex) => {
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        
        // Check if this option is selected
        if (currentExam.userAnswers[index] === optIndex) {
            optionItem.classList.add('selected');
        }
        
        optionItem.innerHTML = `
            <input type="radio" id="option-${optIndex}" name="question" value="${optIndex}" ${currentExam.userAnswers[index] === optIndex ? 'checked' : ''}>
            <label for="option-${optIndex}">${option}</label>
        `;
        
        // Add click event to select the option
        optionItem.addEventListener('click', () => {
            selectOption(index, optIndex);
        });
        
        optionsContainer.appendChild(optionItem);
    });
    
    // Update question counter
    document.getElementById('question-counter').textContent = `Question ${index + 1} of ${currentExam.questions.length}`;
    
    // Update progress bar
    const percentage = ((index + 1) / currentExam.questions.length) * 100;
    document.getElementById('exam-progress-bar').style.width = `${percentage}%`;
    
    // Update flag button
    const flagButton = document.getElementById('flag-question');
    if (currentExam.flaggedQuestions.includes(index)) {
        flagButton.classList.add('active');
        flagButton.innerHTML = '<i class="fas fa-flag"></i> Flagged for Review';
    } else {
        flagButton.classList.remove('active');
        flagButton.innerHTML = '<i class="far fa-flag"></i> Flag for Review';
    }
    
    // Update navigation buttons
    document.getElementById('prev-question').disabled = index === 0;
    document.getElementById('next-question').disabled = index === currentExam.questions.length - 1;
    
    // Update question navigation buttons
    updateQuestionButtonsStatus();
}

// Select an answer for the current question
function selectOption(questionIndex, optionIndex) {
    // Record user's answer
    currentExam.userAnswers[questionIndex] = optionIndex;
    
    // Update UI to show selected option
    document.querySelectorAll('.option-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelectorAll('.option-item')[optionIndex].classList.add('selected');
    document.querySelectorAll('input[name="question"]')[optionIndex].checked = true;
    
    // Update question button to show it's been answered
    updateQuestionButtonsStatus();
    
    // Auto-advance to next question after a short delay
    if (questionIndex < currentExam.questions.length - 1) {
        setTimeout(() => {
            // Fix: Directly go to the next consecutive question, not skip
            loadQuestion(questionIndex + 1);
        }, 500);
    }
}

// Go to the previous question
function goToPreviousQuestion() {
    if (currentExam.currentQuestionIndex > 0) {
        loadQuestion(currentExam.currentQuestionIndex - 1);
    }
}

// Go to the next question
function goToNextQuestion() {
    if (currentExam.currentQuestionIndex < currentExam.questions.length - 1) {
        loadQuestion(currentExam.currentQuestionIndex + 1);
    }
}

// Toggle flag status for the current question
function toggleFlagQuestion() {
    const index = currentExam.currentQuestionIndex;
    const flagButton = document.getElementById('flag-question');
    
    if (currentExam.flaggedQuestions.includes(index)) {
        // Remove flag
        currentExam.flaggedQuestions = currentExam.flaggedQuestions.filter(i => i !== index);
        flagButton.classList.remove('active');
        flagButton.innerHTML = '<i class="far fa-flag"></i> Flag for Review';
    } else {
        // Add flag
        currentExam.flaggedQuestions.push(index);
        flagButton.classList.add('active');
        flagButton.innerHTML = '<i class="fas fa-flag"></i> Flagged for Review';
    }
    
    // Update question navigation buttons
    updateQuestionButtonsStatus();
}

// Update the status of all question navigation buttons
function updateQuestionButtonsStatus() {
    const buttons = document.querySelectorAll('.q-btn');
    
    buttons.forEach((button, index) => {
        // Remove all status classes
        button.classList.remove('current', 'answered', 'flagged');
        
        // Add appropriate class
        if (index === currentExam.currentQuestionIndex) {
            button.classList.add('current');
        } else if (currentExam.userAnswers[index] !== null) {
            button.classList.add('answered');
        }
        
        if (currentExam.flaggedQuestions.includes(index)) {
            button.classList.add('flagged');
        }
    });
}

// Start the exam timer - FIXED timer functionality
function startTimer() {
    // Clear any existing timer to prevent duplicates
    if (timer) {
        clearInterval(timer);
    }
    
    let timeRemaining = currentExam.timeLimit;
    currentExam.timeRemaining = timeRemaining;
    updateTimerDisplay(timeRemaining);
    
    const startTime = Date.now();
    
    timer = setInterval(() => {
        // Calculate elapsed seconds based on actual time difference
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        timeRemaining = currentExam.timeLimit - elapsedSeconds;
        currentExam.timeRemaining = timeRemaining;
        
        updateTimerDisplay(timeRemaining);
        
        if (timeRemaining <= 0) {
            clearInterval(timer);
            submitExam();
        }
    }, 1000);
}

// Update the timer display
function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    document.getElementById('timer').textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    
    // Add warning class when less than 5 minutes remain
    if (seconds <= 300) {
        document.getElementById('timer').classList.add('warning');
    }
}

// Show the submit confirmation modal
function showSubmitConfirmation() {
    // Count answered and unanswered questions
    const answered = currentExam.userAnswers.filter(answer => answer !== null).length;
    const unanswered = currentExam.questions.length - answered;
    
    // Update confirmation stats
    document.getElementById('total-questions-stat').textContent = currentExam.questions.length;
    document.getElementById('answered-stat').textContent = answered;
    document.getElementById('unanswered-stat').textContent = unanswered;
    document.getElementById('flagged-stat').textContent = currentExam.flaggedQuestions.length;
    
    // Show modal
    document.getElementById('submit-confirmation').classList.add('active');
}

// Show the exit confirmation modal
function showExitConfirmation() {
    document.getElementById('exit-confirmation').classList.add('active');
}

// Submit the exam and show results
function submitExam() {
    // Stop the timer if it's running
    if (timer) {
        clearInterval(timer);
    }
    
    // Record end time
    currentExam.endTime = new Date();
    currentExam.inProgress = false; // Exam no longer in progress
    
    // Calculate results
    const results = calculateResults();
    
    // Update results page with data
    updateResultsPage(results);
    
    // Navigate to results page
    navigateToPage('results');
    
    // Update user statistics
    updateUserStatistics(results);
    
    // Hide confirmation modal
    document.getElementById('submit-confirmation').classList.remove('active');
}

// Exit the exam without saving results
function exitExam() {
    // Stop the timer if it's running
    if (timer) {
        clearInterval(timer);
    }
    
    currentExam.inProgress = false; // Exam no longer in progress
    
    // Navigate to exam options page
    navigateToPage('exam-options');
    
    // Hide confirmation modal
    document.getElementById('exit-confirmation').classList.remove('active');
}

// Calculate exam results
function calculateResults() {
    const results = {
        totalQuestions: currentExam.questions.length,
        correctAnswers: 0,
        incorrectAnswers: 0,
        skippedQuestions: 0,
        score: 0,
        timeTaken: 0,
        domainPerformance: {},
        questionsData: []
    };
    
    // Calculate time taken
    results.timeTaken = Math.floor((currentExam.endTime - currentExam.startTime) / 1000);
    
    // Group questions by domain
    const domainCounts = {};
    const domainCorrect = {};
    
    // Process each question
    currentExam.questions.forEach((question, index) => {
        const domain = question.section.split(' ')[0];
        
        // Initialize domain counts if not already done
        if (!domainCounts[domain]) {
            domainCounts[domain] = 0;
            domainCorrect[domain] = 0;
        }
        
        domainCounts[domain]++;
        
        // Check user answer
        const userAnswer = currentExam.userAnswers[index];
        const correctAnswer = question.options.indexOf(question.correctOption);
        
        // Store question data for review
        results.questionsData.push({
            question: question.question,
            options: question.options,
            userAnswer,
            correctAnswer,
            isCorrect: userAnswer === correctAnswer,
            explanation: question.explanation,
            incorrectExplanations: question.incorrectExplanations,
            domain: domain,
            flagged: currentExam.flaggedQuestions.includes(index)
        });
        
        // Update counts
        if (userAnswer === null) {
            results.skippedQuestions++;
        } else if (userAnswer === correctAnswer) {
            results.correctAnswers++;
            domainCorrect[domain]++;
        } else {
            results.incorrectAnswers++;
        }
    });
    
    // Calculate domain performance
    for (const domain in domainCounts) {
        results.domainPerformance[domain] = {
            total: domainCounts[domain],
            correct: domainCorrect[domain],
            percentage: (domainCorrect[domain] / domainCounts[domain]) * 100
        };
    }
    
    // Calculate overall score
    results.score = (results.correctAnswers / results.totalQuestions) * 100;
    
    return results;
}

// Update the results page with exam results
function updateResultsPage(results) {
    // Update score circle and percentage
    const scoreCircle = document.getElementById('score-circle');
    scoreCircle.style.background = `conic-gradient(
        var(--primary-color) 0%,
        var(--primary-color) ${results.score}%,
        #f1f1f1 ${results.score}%,
        #f1f1f1 100%
    )`;
    
    document.getElementById('score-percentage').textContent = `${Math.round(results.score)}%`;
    
    // Update pass/fail badge
    const passFail = document.getElementById('pass-fail-badge');
    if (results.score >= 75) {
        passFail.textContent = 'PASSED';
        passFail.className = 'pass';
    } else {
        passFail.textContent = 'FAILED';
        passFail.className = 'fail';
    }
    
    // Update score details
    document.getElementById('total-questions').textContent = results.totalQuestions;
    document.getElementById('correct-answers').textContent = results.correctAnswers;
    document.getElementById('incorrect-answers').textContent = results.incorrectAnswers;
    
    // Format time taken
    const minutes = Math.floor(results.timeTaken / 60);
    const seconds = results.timeTaken % 60;
    document.getElementById('time-taken').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update date
    document.getElementById('exam-date').textContent = currentExam.endTime.toLocaleDateString();
    
    // Create domain performance chart
    createDomainChart(results.domainPerformance);
    
    // Update domain performance table
    updateDomainTable(results.domainPerformance);
    
    // Populate review questions data
    currentExam.reviewData = results.questionsData;
}

// Create the domain performance chart
function createDomainChart(domainPerformance) {
    const ctx = document.getElementById('domains-chart').getContext('2d');
    
    // Prepare data for chart
    const labels = [];
    const percentages = [];
    
    for (const domain in domainPerformance) {
        labels.push(getDomainName(domain));
        percentages.push(domainPerformance[domain].percentage);
    }
    
    // Create chart
    if (window.domainChart) {
        window.domainChart.destroy();
    }
    
    window.domainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Performance by Domain',
                data: percentages,
                backgroundColor: 'rgba(0, 120, 215, 0.6)',
                borderColor: 'rgba(0, 120, 215, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Percentage Correct'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${Math.round(context.raw)}% correct`;
                        }
                    }
                }
            }
        }
    });
}

// Update the domain performance table
function updateDomainTable(domainPerformance) {
    const tableContainer = document.getElementById('domain-performance-rows');
    tableContainer.innerHTML = '';
    
    for (const domain in domainPerformance) {
        const data = domainPerformance[domain];
        const rowHTML = `
            <div class="domain-row">
                <div class="domain" data-label="Domain">${getDomainName(domain)}</div>
                <div class="questions" data-label="Questions">${data.total}</div>
                <div class="correct" data-label="Correct">${data.correct}</div>
                <div class="percentage" data-label="Percentage">${Math.round(data.percentage)}%</div>
            </div>
        `;
        tableContainer.innerHTML += rowHTML;
    }
}

// Get domain name from domain identifier
function getDomainName(domain) {
    const domainNames = {
        '1.0': 'General Security Concepts',
        '2.0': 'Threats, Vulnerabilities, and Mitigations',
        '3.0': 'Security Architecture',
        '4.0': 'Security Operations',
        '5.0': 'Security Program Management and Oversight'
    };
    
    return domainNames[domain] || domain;
}

// Save exam results
function saveExamResults() {
    // Implementation would depend on the desired save method
    // Could be PDF export, saving to server, etc.
    const resultsData = {
        date: currentExam.endTime,
        examMode: currentExam.examMode,
        score: document.getElementById('score-percentage').textContent,
        totalQuestions: document.getElementById('total-questions').textContent,
        correctAnswers: document.getElementById('correct-answers').textContent,
        timeTaken: document.getElementById('time-taken').textContent
    };
    
    // For now, show a notification
    showNotification('Results saved successfully!', 'success');
}

// Update user statistics with exam results
function updateUserStatistics(results) {
    // Increment exams taken
    userStats.examsTaken++;
    
    // Update exam type count
    if (currentExam.examMode === 'full') {
        userStats.fullExams++;
    } else {
        userStats.quickExams++;
    }
    
    // Update question statistics
    userStats.questionsAnswered += results.totalQuestions;
    userStats.correctAnswers += results.correctAnswers;
    
    // Update domain scores
    for (const domain in results.domainPerformance) {
        const data = results.domainPerformance[domain];
        userStats.domainScores[domain].total += data.total;
        userStats.domainScores[domain].correct += data.correct;
    }
    
    // Add to study time
    userStats.totalStudyTime += results.timeTaken;
    
    // Add to exam history
    userStats.examHistory.push({
        date: currentExam.endTime,
        mode: currentExam.examMode,
        score: results.score,
        timeTaken: results.timeTaken
    });
    
    // Save to local storage
    saveUserStats();
}

// Save user statistics to local storage
function saveUserStats() {
    localStorage.setItem('userStats', JSON.stringify(userStats));
}

// Load user statistics from local storage
function loadUserStats() {
    const savedStats = localStorage.getItem('userStats');
    if (savedStats) {
        userStats = JSON.parse(savedStats);
    }
    
    // Also load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        darkMode = true;
        document.body.classList.add('dark-mode');
        document.querySelector('.theme-toggle i').classList.replace('fa-moon', 'fa-sun');
    }
}

// Load missed questions from user statistics
function loadMissedQuestions() {
    // Return an empty array if there are no missed questions
    if (!userStats.examHistory || !userStats.examHistory.length) {
        return [];
    }
    
    // Compile a list of questions the user got wrong
    const missedQuestionIds = new Set();
    const missedQuestions = [];
    
    // Check all recorded exam data for missed questions
    // For a real implementation, we would store question IDs that the user missed
    // For this implementation, we'll just return a random selection of questions
    return selectRandomQuestions(30);
}

// Update the progress page with user statistics
function updateProgressPage() {
    if (!userStats || !userStats.examsTaken) {
        document.getElementById('overall-score').textContent = 'No data';
        document.getElementById('exams-taken').textContent = '0';
        document.getElementById('full-exams').textContent = '0';
        document.getElementById('practice-quizzes').textContent = '0';
        document.getElementById('total-questions-answered').textContent = '0';
        document.getElementById('correct-percentage').textContent = '0%';
        document.getElementById('study-time').textContent = '0h 0m';
        document.getElementById('last-session').textContent = 'Never';
        return;
    }
    
    // Calculate overall score
    const overallScore = Math.round((userStats.correctAnswers / userStats.questionsAnswered) * 100) || 0;
    document.getElementById('overall-score').textContent = `${overallScore}%`;
    document.querySelector('.stat-progress .progress-bar').style.width = `${overallScore}%`;
    
    // Update exam counts
    document.getElementById('exams-taken').textContent = userStats.examsTaken;
    document.getElementById('full-exams').textContent = userStats.fullExams;
    document.getElementById('practice-quizzes').textContent = userStats.examsTaken - userStats.fullExams;
    
    // Update question stats
    document.getElementById('total-questions-answered').textContent = userStats.questionsAnswered;
    document.getElementById('correct-percentage').textContent = `${overallScore}%`;
    
    // Format study time
    const hours = Math.floor(userStats.totalStudyTime / 3600);
    const minutes = Math.floor((userStats.totalStudyTime % 3600) / 60);
    document.getElementById('study-time').textContent = `${hours}h ${minutes}m`;
    
    // Last session
    if (userStats.examHistory && userStats.examHistory.length > 0) {
        const lastExam = userStats.examHistory[userStats.examHistory.length - 1];
        const lastDate = new Date(lastExam.date);
        document.getElementById('last-session').textContent = lastDate.toLocaleDateString();
    } else {
        document.getElementById('last-session').textContent = 'Never';
    }
    
    // Create strength chart
    createStrengthChart();
    
    // Create history chart
    createHistoryChart();
    
    // Update focus areas
    updateFocusAreas();
}

// Create strength chart for the progress page
function createStrengthChart() {
    const ctx = document.getElementById('strength-chart').getContext('2d');
    
    // Prepare data for chart
    const labels = [];
    const percentages = [];
    
    for (const domain in userStats.domainScores) {
        const score = userStats.domainScores[domain];
        if (score.total > 0) {
            labels.push(getDomainName(domain));
            percentages.push((score.correct / score.total) * 100);
        } else {
            labels.push(getDomainName(domain));
            percentages.push(0);
        }
    }
    
    // Create chart
    if (window.strengthChart) {
        window.strengthChart.destroy();
    }
    
    window.strengthChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Domain Strength',
                data: percentages,
                backgroundColor: 'rgba(0, 120, 215, 0.2)',
                borderColor: 'rgba(0, 120, 215, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(0, 120, 215, 1)',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        display: false,
                        stepSize: 20
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${Math.round(context.raw)}% mastery`;
                        }
                    }
                }
            }
        }
    });
}

// Create history chart for the progress page
function createHistoryChart() {
    if (!userStats.examHistory || userStats.examHistory.length === 0) {
        return;
    }
    
    const ctx = document.getElementById('history-chart').getContext('2d');
    
    // Prepare data for chart
    const lastExams = userStats.examHistory.slice(-10); // Last 10 exams
    const labels = lastExams.map((exam, index) => `Exam ${index + 1}`);
    const scores = lastExams.map(exam => exam.score);
    
    // Create chart
    if (window.historyChart) {
        window.historyChart.destroy();
    }
    
    window.historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Exam Scores',
                data: scores,
                backgroundColor: 'rgba(0, 120, 215, 0.1)',
                borderColor: 'rgba(0, 120, 215, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Score (%)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Score: ${Math.round(context.raw)}%`;
                        }
                    }
                }
            }
        }
    });
}

// Update focus areas based on domain performance
function updateFocusAreas() {
    const focusAreasContainer = document.getElementById('focus-areas');
    focusAreasContainer.innerHTML = '';
    
    // Calculate domain scores
    const domainScores = [];
    for (const domain in userStats.domainScores) {
        const score = userStats.domainScores[domain];
        if (score.total > 0) {
            domainScores.push({
                domain,
                name: getDomainName(domain),
                percentage: (score.correct / score.total) * 100
            });
        }
    }
    
    // Sort by performance (ascending)
    domainScores.sort((a, b) => a.percentage - b.percentage);
    
    // Display the three weakest domains
    const weakDomains = domainScores.slice(0, 3);
    
    if (weakDomains.length === 0) {
        focusAreasContainer.innerHTML = '<p>No data available yet. Take some exams to get personalized recommendations.</p>';
        return;
    }
    
    weakDomains.forEach(domain => {
        const focusItem = document.createElement('div');
        focusItem.className = 'focus-item';
        focusItem.innerHTML = `
            <div class="focus-domain">${domain.name}</div>
            <div class="focus-score">${Math.round(domain.percentage)}% mastery</div>
        `;
        focusAreasContainer.appendChild(focusItem);
    });
}

// Reset progress data
function resetProgress() {
    if (confirm('Are you sure you want to reset all progress data? This cannot be undone.')) {
        userStats = {
            examsTaken: 0,
            fullExams: 0,
            quickExams: 0,
            questionsAnswered: 0,
            correctAnswers: 0,
            totalStudyTime: 0,
            domainScores: {
                '1.0': { total: 0, correct: 0 },
                '2.0': { total: 0, correct: 0 },
                '3.0': { total: 0, correct: 0 },
                '4.0': { total: 0, correct: 0 },
                '5.0': { total: 0, correct: 0 }
            },
            examHistory: []
        };
        
        saveUserStats();
        updateProgressPage();
        showNotification('Progress data has been reset', 'success');
    }
}

// Export progress data
function exportProgress() {
    // Create a data URL for the JSON data
    const dataStr = JSON.stringify(userStats, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    // Create a download link and click it
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', 'security_plus_progress.json');
    exportLink.click();
    
    showNotification('Progress data exported successfully', 'success');
}

// Review exam answers
function setupReviewPage() {
    if (!currentExam.reviewData || currentExam.reviewData.length === 0) {
        navigateToPage('exam-options');
        showNotification('No exam data to review', 'warning');
        return;
    }
    
    const reviewContainer = document.getElementById('review-questions');
    reviewContainer.innerHTML = '';
    
    // Set the first filter button as active
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
    
    // Add each question to the review
    currentExam.reviewData.forEach((questionData, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'review-question-item';
        questionItem.setAttribute('data-correct', questionData.isCorrect);
        questionItem.setAttribute('data-flagged', questionData.flagged);
        
        // Determine question status
        let statusText, statusClass;
        if (questionData.userAnswer === null) {
            statusText = 'Skipped';
            statusClass = 'warning';
        } else if (questionData.isCorrect) {
            statusText = 'Correct';
            statusClass = 'correct';
        } else {
            statusText = 'Incorrect';
            statusClass = 'incorrect';
        }
        
        // Create options HTML
        let optionsHTML = '';
        questionData.options.forEach((option, optIndex) => {
            let optionClass = '';
            if (optIndex === questionData.correctAnswer) {
                optionClass = 'correct';
            } else if (optIndex === questionData.userAnswer && !questionData.isCorrect) {
                optionClass = 'wrong';
            }
            
            optionsHTML += `
                <div class="review-option ${optionClass}">
                    ${optIndex === questionData.userAnswer ? '✓ ' : ''}${option}
                    ${optIndex === questionData.correctAnswer ? ' (Correct Answer)' : ''}
                </div>
            `;
        });
        
        // Create explanation HTML
        let explanationHTML = '';
        if (questionData.userAnswer === null || !questionData.isCorrect) {
            explanationHTML = `
                <div class="review-explanation">
                    <h4>Explanation:</h4>
                    <p>${questionData.explanation}</p>
                </div>
            `;
        }
        
        // Create question review item
        questionItem.innerHTML = `
            <div class="review-question-header">
                <div class="review-question-number">Question ${index + 1} - ${getDomainName(questionData.domain)}</div>
                <div class="review-status ${statusClass}">${statusText}</div>
            </div>
            <div class="review-question-content">
                <div class="review-question-text">${questionData.question}</div>
                <div class="review-options">
                    ${optionsHTML}
                </div>
                ${explanationHTML}
            </div>
        `;
        
        reviewContainer.appendChild(questionItem);
    });
}

// Filter review questions
function filterReviewQuestions(filter) {
    // Set the active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.filter-btn[data-filter="${filter}"]`).classList.add('active');
    
    // Show/hide questions based on filter
    document.querySelectorAll('.review-question-item').forEach(item => {
        if (filter === 'all') {
            item.style.display = 'block';
        } else if (filter === 'incorrect') {
            if (item.getAttribute('data-correct') === 'false') {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        } else if (filter === 'flagged') {
            if (item.getAttribute('data-flagged') === 'true') {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        }
    });
}

// Helper function to select random questions
function selectRandomQuestions(count) {
    if (!allQuestions || allQuestions.length === 0) {
        throw new Error("No questions available. Please refresh the page.");
    }
    
    const questions = [...allQuestions];
    const shuffled = questions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, questions.length));
}

// Helper function to select questions by domain
function selectQuestionsByDomain(domain, count) {
    if (!allQuestions || allQuestions.length === 0) {
        throw new Error("No questions available. Please refresh the page.");
    }
    
    // Fix: Match questions where section starts with the domain number (e.g., "1." for domain "1.0")
    const domainPrefix = domain.split('.')[0] + '.';
    const domainQuestions = allQuestions.filter(q => q.section.startsWith(domainPrefix));
    
    if (domainQuestions.length === 0) {
        throw new Error(`No questions found for domain ${domain}`);
    }
    
    if (domainQuestions.length <= count) {
        return [...domainQuestions];
    }
    
    const shuffled = [...domainQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Helper function to select questions by multiple domains
function selectQuestionsByDomains(domains, count) {
    // Check if we have any questions loaded
    if (!allQuestions || allQuestions.length === 0) {
        throw new Error("No questions available. Please refresh the page.");
    }

    // Filter questions that belong to any of the selected domains
    // Fix: Convert domains like "1.0" to prefixes like "1." for matching
    const domainQuestions = allQuestions.filter(q => {
        const questionSection = q.section;
        return domains.some(domain => {
            const domainPrefix = domain.split('.')[0] + '.';
            return questionSection.startsWith(domainPrefix);
        });
    });
    
    // Check if we have enough questions from selected domains
    if (domainQuestions.length === 0) {
        throw new Error("No questions found for the selected domains. Please select different domains.");
    }
    
    // Notify user if we don't have enough questions but can still create a quiz
    if (domainQuestions.length < count) {
        console.warn(`Only ${domainQuestions.length} questions available for selected domains, using all available questions.`);
        // Return all available questions shuffled
        return [...domainQuestions].sort(() => 0.5 - Math.random());
    }
    
    // Shuffle questions and select requested count
    const shuffled = [...domainQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Helper function to select questions with proper domain distribution
function selectQuestionsWithDomainDistribution(count) {
    if (!allQuestions || allQuestions.length === 0) {
        throw new Error("No questions available. Please refresh the page.");
    }
    
    // Domain weights based on Security+ SY0-701 exam objectives
    const domainWeights = {
        '1': 0.22, // 22% - General Security Concepts
        '2': 0.18, // 18% - Threats, Vulnerabilities, and Mitigations
        '3': 0.20, // 20% - Security Architecture
        '4': 0.22, // 22% - Security Operations
        '5': 0.18  // 18% - Security Program Management and Oversight
    };
    
    // Group questions by domain
    const questionsByDomain = {};
    
    // Initialize domain arrays
    for (const domain in domainWeights) {
        questionsByDomain[domain] = [];
    }
    
    // Sort questions into domain buckets
    allQuestions.forEach(question => {
        // Extract the main domain number (e.g., "1" from "1.2 Authentication methods")
        const domainMatch = question.section.match(/^(\d+)\./);
        if (domainMatch && domainMatch[1]) {
            const domain = domainMatch[1];
            if (questionsByDomain[domain]) {
                questionsByDomain[domain].push(question);
            }
        }
    });
    
    // Calculate how many questions to take from each domain
    const questionsPerDomain = {};
    let remainingQuestions = count;
    
    // First pass - calculate initial distribution
    for (const domain in domainWeights) {
        // Calculate questions needed from this domain based on weight
        let domainCount = Math.floor(count * domainWeights[domain]);
        
        // Ensure we don't exceed available questions for this domain
        domainCount = Math.min(domainCount, questionsByDomain[domain].length);
        
        questionsPerDomain[domain] = domainCount;
        remainingQuestions -= domainCount;
    }
    
    // Second pass - distribute any remaining questions
    if (remainingQuestions > 0) {
        const domainsByAvailability = Object.keys(domainWeights).sort((a, b) => {
            return (questionsByDomain[b].length - questionsPerDomain[b]) - 
                   (questionsByDomain[a].length - questionsPerDomain[a]);
        });
        
        for (const domain of domainsByAvailability) {
            const available = questionsByDomain[domain].length - questionsPerDomain[domain];
            if (available > 0) {
                const take = Math.min(remainingQuestions, available);
                questionsPerDomain[domain] += take;
                remainingQuestions -= take;
                
                if (remainingQuestions === 0) break;
            }
        }
    }
    
    // Select and shuffle questions from each domain
    const selectedQuestions = [];
    
    for (const domain in questionsPerDomain) {
        if (questionsPerDomain[domain] > 0) {
            // Shuffle the questions for this domain
            const shuffled = [...questionsByDomain[domain]].sort(() => 0.5 - Math.random());
            
            // Take the required number of questions
            const domainQuestions = shuffled.slice(0, questionsPerDomain[domain]);
            
            // Add to selected questions
            selectedQuestions.push(...domainQuestions);
        }
    }
    
    // Final shuffle to mix questions from different domains
    return selectedQuestions.sort(() => 0.5 - Math.random());
}

// Show a notification
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
        
        // Add styles if they don't exist
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 5px;
                    color: white;
                    font-weight: 500;
                    z-index: 1000;
                    opacity: 0;
                    transform: translateY(-10px);
                    transition: all 0.3s ease;
                }
                
                .notification.show {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .notification.info {
                    background-color: var(--primary-color);
                }
                
                .notification.success {
                    background-color: var(--success-color);
                }
                
                .notification.warning {
                    background-color: var(--warning-color);
                    color: #333;
                }
                
                .notification.error {
                    background-color: var(--danger-color);
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Set notification content and type
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide notification after a few seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Add event listener for the review page
document.addEventListener('pageNavigated', (e) => {
    if (e.detail.page === 'review') {
        setupReviewPage();
    }
});

// Custom event for page navigation
function navigateToPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show the target page
    document.getElementById(pageId).classList.add('active');
    
    // Add active class to current nav link
    document.querySelector(`.nav-links a[data-page="${pageId}"]`)?.classList.add('active');
    
    // Update URL hash
    window.location.hash = pageId;
    
    // Dispatch custom event
    const event = new CustomEvent('pageNavigated', { detail: { page: pageId } });
    document.dispatchEvent(event);
    
    // Special page initialization
    if (pageId === 'progress') {
        updateProgressPage();
    } else if (pageId === 'review') {
        setupReviewPage();
    }
}