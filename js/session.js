document.addEventListener('DOMContentLoaded', () => {
    // Get session ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');

    // If session ID or user info is missing, redirect to home
    if (!sessionId || !userId || !username) {
        window.location.href = 'index.html';
        return;
    }

    // References to DOM elements
    const sessionIdDisplay = document.getElementById('session-id-display');
    const copySessionBtn = document.getElementById('copy-session-id');
    const startTimerBtn = document.getElementById('start-timer');
    const countdownDisplay = document.getElementById('countdown-display');
    const votingSection = document.getElementById('voting-section');
    const participantsList = document.getElementById('participants-list');
    const resultsSection = document.getElementById('results-section');
    const estimateButtons = document.querySelectorAll('.estimate-btn');
    const customEstimateInput = document.getElementById('custom-estimate');
    const submitCustomBtn = document.getElementById('submit-custom');
    const resultsDiv = document.getElementById('results');
    const finalEstimateDiv = document.getElementById('final-estimate');
    const newEstimationBtn = document.getElementById('new-estimation');

    // Display session ID
    sessionIdDisplay.textContent = sessionId;

    // Copy session ID to clipboard
    copySessionBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(sessionId)
            .then(() => alert('Session ID copied to clipboard!'))
            .catch(err => console.error('Failed to copy:', err));
    });

    // Timer variables
    let timerInterval = null;
    let secondsRemaining = 30;

    // Update timer display
    function updateTimerDisplay(seconds) {
        countdownDisplay.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }

    // Start the voting timer
    startTimerBtn.addEventListener('click', async () => {
        try {
            // Update session status to voting
            const { error } = await supabase
                .from('sessions')
                .update({ status: 'voting' })
                .eq('id', sessionId);
                
            if (error) throw error;
            
            // Start the countdown
            secondsRemaining = 30; // 30 seconds countdown
            updateTimerDisplay(secondsRemaining);
            
            timerInterval = setInterval(async () => {
                secondsRemaining--;
                updateTimerDisplay(secondsRemaining);
                
                if (secondsRemaining <= 0) {
                    clearInterval(timerInterval);
                    
                    // Update session status to completed
                    await supabase
                        .from('sessions')
                        .update({ status: 'completed' })
                        .eq('id', sessionId);
                }
            }, 1000);
            
            // Disable the start button
            startTimerBtn.disabled = true;
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    });

    // Handle vote submission
    async function submitVote(estimate) {
        try {
            const { error } = await supabase
                .from('participants')
                .update({ 
                    estimate: parseFloat(estimate),
                    voted: true
                })
                .eq('session_id', sessionId)
                .eq('user_id', userId);
                
            if (error) throw error;
        } catch (error) {
            console.error('Error submitting vote:', error);
            alert('Error submitting your vote. Please try again.');
        }
    }

    // Set up estimate buttons
    estimateButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all buttons
            estimateButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            button.classList.add('selected');
            // Submit the vote
            submitVote(button.dataset.value);
        });
    });

    // Custom estimate submission
    submitCustomBtn.addEventListener('click', () => {
        const customValue = customEstimateInput.value;
        if (customValue && !isNaN(customValue) && parseFloat(customValue) > 0) {
            // Remove selected class from all buttons
            estimateButtons.forEach(btn => btn.classList.remove('selected'));
            // Submit the vote
            submitVote(customValue);
        } else {
            alert('Please enter a valid positive number');
        }
    });

    // New estimation button
    newEstimationBtn.addEventListener('click', async () => {
        try {
            // Reset the session for a new estimation
            await supabase
                .from('sessions')
                .update({ status: 'waiting' })
                .eq('id', sessionId);
                
            // Reset participants' votes
            await supabase
                .from('participants')
                .update({ voted: false, estimate: null })
                .eq('session_id', sessionId);
        } catch (error) {
            console.error('Error resetting session:', error);
        }
    });

    // Set up real-time subscription for session status changes
    const sessionSubscription = supabase
        .channel('public:sessions')
        .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, 
            payload => {
                const session = payload.new;
                if (!session) return;
                
                switch(session.status) {
                    case 'waiting':
                        votingSection.classList.add('hidden');
                        resultsSection.classList.add('hidden');
                        startTimerBtn.disabled = false;
                        if (timerInterval) {
                            clearInterval(timerInterval);
                            updateTimerDisplay(30);
                        }
                        break;
                    case 'voting':
                        votingSection.classList.remove('hidden');
                        resultsSection.classList.add('hidden');
                        break;
                    case 'completed':
                        votingSection.classList.add('hidden');
                        resultsSection.classList.remove('hidden');
                        calculateResults();
                        if (timerInterval) {
                            clearInterval(timerInterval);
                        }
                        break;
                }
            }
        )
        .subscribe();

    // Set up real-time subscription for participants changes
    const participantsSubscription = supabase
        .channel('public:participants')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` }, 
            async () => {
                // Fetch the latest participants data
                const { data: participants, error } = await supabase
                    .from('participants')
                    .select('*')
                    .eq('session_id', sessionId);
                
                if (error) {
                    console.error('Error fetching participants:', error);
                    return;
                }
                
                // Update participants list
                participantsList.innerHTML = '';
                
                participants.forEach(participant => {
                    // Create list item for participant
                    const listItem = document.createElement('li');
                    listItem.textContent = `${participant.name} ${participant.voted ? '✓' : ''}`;
                    if (participant.voted) {
                        listItem.classList.add('voted');
                    }
                    participantsList.appendChild(listItem);
                });
                
                // If everyone has voted, complete the session
                const allVoted = participants.every(p => p.voted);
                if (allVoted && participants.length >= 2) {
                    // Check current session status
                    const { data: sessionData } = await supabase
                        .from('sessions')
                        .select('status')
                        .eq('id', sessionId)
                        .single();
                        
                    // Only update if not already completed
                    if (sessionData && sessionData.status !== 'completed') {
                        await supabase
                            .from('sessions')
                            .update({ status: 'completed' })
                            .eq('id', sessionId);
                    }
                }
            }
        )
        .subscribe();

    // Calculate and display results
    async function calculateResults() {
        try {
            const { data: participants, error } = await supabase
                .from('participants')
                .select('name, estimate, voted')
                .eq('session_id', sessionId);
                
            if (error) throw error;
            
            const validParticipants = participants.filter(p => p.voted && p.estimate !== null);
            const estimates = validParticipants.map(p => p.estimate);
            
            // Display individual estimates
            resultsDiv.innerHTML = '<h4>Individual Estimates:</h4>';
            validParticipants.forEach(p => {
                resultsDiv.innerHTML += `<p>${p.name}: ${p.estimate} hours</p>`;
            });
            
            if (estimates.length === 0) {
                finalEstimateDiv.textContent = 'No votes submitted';
                return;
            }
            
            // Calculate weighted average (using median for outlier resistance)
            const sortedEstimates = [...estimates].sort((a, b) => a - b);
            let finalEstimate;
            
            if (sortedEstimates.length % 2 === 0) {
                // Even number of estimates - average the middle two
                const mid = sortedEstimates.length / 2;
                finalEstimate = (sortedEstimates[mid - 1] + sortedEstimates[mid]) / 2;
            } else {
                // Odd number - take the middle one
                finalEstimate = sortedEstimates[Math.floor(sortedEstimates.length / 2)];
            }
            
            // Display final estimate
            finalEstimateDiv.textContent = `Final Estimate: ${finalEstimate} hours`;
        } catch (error) {
            console.error('Error calculating results:', error);
        }
    }

    // Initial data load
    async function loadInitialData() {
        try {
            // Fetch session data
            const { data: session, error: sessionError } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', sessionId)
                .single();
                
            if (sessionError) throw sessionError;
            
            // Fetch participants
            const { data: participants, error: participantsError } = await supabase
                .from('participants')
                .select('*')
                .eq('session_id', sessionId);
                
            if (participantsError) throw participantsError;
            
            // Update UI based on session status
            if (session) {
                switch(session.status) {
                    case 'waiting':
                        votingSection.classList.add('hidden');
                        resultsSection.classList.add('hidden');
                        break;
                    case 'voting':
                        votingSection.classList.remove('hidden');
                        resultsSection.classList.add('hidden');
                        break;
                    case 'completed':
                        votingSection.classList.add('hidden');
                        resultsSection.classList.remove('hidden');
                        calculateResults();
                        break;
                }
            }
            
            // Update participants list
            participantsList.innerHTML = '';
            participants.forEach(participant => {
                const listItem = document.createElement('li');
                listItem.textContent = `${participant.name} ${participant.voted ? '✓' : ''}`;
                if (participant.voted) {
                    listItem.classList.add('voted');
                }
                participantsList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }
    
    // Load initial data
    loadInitialData();
    
    // Clean up subscriptions when leaving the page
    window.addEventListener('beforeunload', () => {
        supabase.removeChannel(sessionSubscription);
        supabase.removeChannel(participantsSubscription);
    });
});
