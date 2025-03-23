// Initialize Supabase client
const SUPABASE_URL = 'https://fwcagnhqsovrrbkhuuba.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Y2Fnbmhxc292cnJia2h1dWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjQzOTcsImV4cCI6MjA1ODAwMDM5N30.F60ydgy3-A5tl5aeMLUpY04lc3b5K7CK9km4gUtocxY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// UI elements
const sessionSetup = document.getElementById('sessionSetup');
const votingSection = document.getElementById('votingSection');
const resultsSection = document.getElementById('resultsSection');
const statusMessage = document.getElementById('statusMessage');
const sessionList = document.getElementById('sessionList');
const activeSessions = document.getElementById('activeSessions');

// State management
let currentSession = null;
let currentUser = null;
let votingSubscription = null;
let sessionSubscription = null;

// Initialize the app
async function initApp() {
    try {
        // Check if tables exist, if not create them
        await setupDatabase();
        
        // Set up event listeners
        setupEventListeners();
        
    } catch (error) {
        showStatus('Error initializing app: ' + error.message, 'error');
        console.error('Initialization error:', error);
    }
}

// Set up required database tables if they don't exist
async function setupDatabase() {
    // For GitHub Pages, we're assuming tables are already created in Supabase
    // Usually we'd create them here, but we'll rely on them being pre-created
    
    // Quick check to see if we can connect to Supabase
    const { data, error } = await supabase.from('voting_sessions').select('count');
    
    if (error && error.code === '42P01') {
        // Table doesn't exist, show instructions
        showStatus('Database tables not set up. Please create the required tables in Supabase.', 'error');
        console.error('Missing database tables. Create the following tables in Supabase:');
        console.error('1. voting_sessions: id, name, voter_count, created_at, active');
        console.error('2. votes: id, session_id, voter_name, vote_value, created_at');
        throw new Error('Database not set up');
    } else if (error) {
        showStatus('Error connecting to database: ' + error.message, 'error');
        throw error;
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Create session button
    document.getElementById('createSessionBtn').addEventListener('click', createSession);
    
    // Join session button
    document.getElementById('joinSessionBtn').addEventListener('click', showActiveSessions);
    
    // Vote buttons
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', () => submitVote(parseInt(btn.dataset.value)));
    });
    
    // Submit custom vote
    document.getElementById('submitCustomBtn').addEventListener('click', () => {
        const customValue = parseInt(document.getElementById('customVote').value);
        if (customValue && !isNaN(customValue) && customValue > 0) {
            submitVote(customValue);
        } else {
            showStatus('Please enter a valid positive number', 'error');
        }
    });
    
    // New session button
    document.getElementById('newSessionBtn').addEventListener('click', resetApp);
}

// Create a new voting session
async function createSession() {
    try {
        const sessionName = document.getElementById('sessionName').value.trim();
        const voterCount = parseInt(document.getElementById('voterCount').value);
        const userName = document.getElementById('userName').value.trim();
        
        if (!sessionName || !userName) {
            showStatus('Please enter both session name and your name', 'error');
            return;
        }
        
        if (isNaN(voterCount) || voterCount < 2 || voterCount > 8) {
            showStatus('Number of voters must be between 2 and 8', 'error');
            return;
        }
        
        // Check if session already exists
        const { data: existingSession } = await supabase
            .from('voting_sessions')
            .select()
            .eq('name', sessionName)
            .eq('active', true);
            
        if (existingSession && existingSession.length > 0) {
            showStatus('A session with this name already exists', 'error');
            return;
        }
        
        // Create new session
        const { data: session, error } = await supabase
            .from('voting_sessions')
            .insert([
                { name: sessionName, voter_count: voterCount, active: true }
            ])
            .select();
            
        if (error) throw error;
        
        currentSession = session[0];
        currentUser = userName;
        
        // Subscribe to votes for this session
        subscribeToVotes(currentSession.id);
        
        // Update UI to voting phase
        showVotingUI();
        
        showStatus('Voting session created!', 'success');
    } catch (error) {
        showStatus('Error creating session: ' + error.message, 'error');
        console.error('Error creating session:', error);
    }
}

// Show active sessions for joining
async function showActiveSessions() {
    try {
        // Get username first
        const userName = document.getElementById('userName').value.trim();
        if (!userName) {
            showStatus('Please enter your name first', 'error');
            return;
        }
        currentUser = userName;
        
        // Fetch active sessions
        const { data: sessions, error } = await supabase
            .from('voting_sessions')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (!sessions || sessions.length === 0) {
            showStatus('No active sessions found', 'info');
            return;
        }
        
        // Display sessions
        activeSessions.innerHTML = '';
        sessions.forEach(session => {
            const li = document.createElement('li');
            li.textContent = `${session.name} (${session.voter_count} voters)`;
            li.addEventListener('click', () => joinSession(session));
            activeSessions.appendChild(li);
        });
        
        sessionList.style.display = 'block';
    } catch (error) {
        showStatus('Error loading sessions: ' + error.message, 'error');
        console.error('Error loading sessions:', error);
    }
}

// Join an existing session
async function joinSession(session) {
    try {
        currentSession = session;
        
        // Subscribe to votes for this session
        subscribeToVotes(currentSession.id);
        
        // Update UI to voting phase
        showVotingUI();
        
        showStatus('Joined session: ' + currentSession.name, 'success');
    } catch (error) {
        showStatus('Error joining session: ' + error.message, 'error');
        console.error('Error joining session:', error);
    }
}

// Subscribe to votes for real-time updates
function subscribeToVotes(sessionId) {
    // Clean up any existing subscription
    if (votingSubscription) {
        supabase.removeSubscription(votingSubscription);
    }
    
    // Subscribe to changes in votes table
    votingSubscription = supabase
        .channel('votes-channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'votes', filter: `session_id=eq.${sessionId}` },
            (payload) => {
                updateVoterList();
                checkResults();
            }
        )
        .subscribe();
        
    // Do initial fetch of votes
    updateVoterList();
}

// Submit a vote
async function submitVote(value) {
    try {
        if (!currentSession || !currentUser) {
            showStatus('Session information missing', 'error');
            return;
        }
        
        // Check if user already voted
        const { data: existingVotes } = await supabase
            .from('votes')
            .select()
            .eq('session_id', currentSession.id)
            .eq('voter_name', currentUser);
            
        if (existingVotes && existingVotes.length > 0) {
            // Update existing vote
            const { error } = await supabase
                .from('votes')
                .update({ vote_value: value })
                .eq('id', existingVotes[0].id);
                
            if (error) throw error;
            showStatus('Your vote was updated!', 'success');
        } else {
            // Submit new vote
            const { error } = await supabase
                .from('votes')
                .insert([
                    { 
                        session_id: currentSession.id,
                        voter_name: currentUser,
                        vote_value: value
                    }
                ]);
                
            if (error) throw error;
            showStatus('Your vote was submitted!', 'success');
        }
        
        // Update UI
        updateVoterList();
        checkResults();
    } catch (error) {
        showStatus('Error submitting vote: ' + error.message, 'error');
        console.error('Error submitting vote:', error);
    }
}

// Update the list of voters and their status
async function updateVoterList() {
    try {
        if (!currentSession) return;
        
        // Get all votes for the current session
        const { data: votes, error } = await supabase
            .from('votes')
            .select('voter_name')
            .eq('session_id', currentSession.id);
            
        if (error) throw error;
        
        // Update voters count
        const totalVoters = currentSession.voter_count;
        const submittedVotes = votes ? votes.length : 0;
        
        document.getElementById('currentSessionName').textContent = currentSession.name;
        document.getElementById('totalVoters').textContent = totalVoters;
        document.getElementById('votersSubmitted').textContent = submittedVotes;
        
        // Update voter list
        const voterList = document.getElementById('voterList');
        voterList.innerHTML = '';
        
        // Add voted users
        if (votes) {
            votes.forEach(vote => {
                const li = document.createElement('li');
                li.textContent = vote.voter_name;
                li.classList.add('voted');
                li.innerHTML += ' <span>✓</span>';
                voterList.appendChild(li);
            });
        }
        
        // Add placeholder for remaining voters
        const remainingVoters = totalVoters - submittedVotes;
        for (let i = 0; i < remainingVoters; i++) {
            const li = document.createElement('li');
            li.textContent = `Waiting for voter...`;
            li.classList.add('waiting');
            voterList.appendChild(li);
        }
        
        // Check if voting is complete
        if (submittedVotes >= totalVoters) {
            checkResults();
        }
    } catch (error) {
        console.error('Error updating voter list:', error);
    }
}

// Check if all votes are in and show results
async function checkResults() {
    try {
        if (!currentSession) return;
        
        // Get votes count
        const { count, error: countError } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', currentSession.id);
            
        if (countError) throw countError;
        
        // If all votes are in, show results
        if (count >= currentSession.voter_count) {
            // Get all votes with values
            const { data: votes, error } = await supabase
                .from('votes')
                .select('voter_name, vote_value')
                .eq('session_id', currentSession.id);
                
            if (error) throw error;
            
            // Calculate average
            const sum = votes.reduce((acc, vote) => acc + vote.vote_value, 0);
            const average = sum / votes.length;
            
            // Display results
            document.getElementById('averageResult').textContent = average.toFixed(1);
            
            const individualVotes = document.getElementById('individualVotes');
            individualVotes.innerHTML = '';
            
            votes.forEach(vote => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${vote.voter_name}</span> <span>${vote.vote_value}</span>`;
                individualVotes.appendChild(li);
            });
            
            // Show results section
            votingSection.style.display = 'none';
            resultsSection.style.display = 'block';
            
            // Mark session as inactive
            await supabase
                .from('voting_sessions')
                .update({ active: false })
                .eq('id', currentSession.id);
        }
    } catch (error) {
        console.error('Error checking results:', error);
        showStatus('Error loading results: ' + error.message, 'error');
    }
}

// Show the voting UI
function showVotingUI() {
    sessionSetup.style.display = 'none';
    votingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    
    // Update session info
    updateVoterList();
}

// Reset app to initial state
function resetApp() {
    // Clean up subscriptions
    if (votingSubscription) {
        supabase.removeSubscription(votingSubscription);
        votingSubscription = null;
    }
    
    if (sessionSubscription) {
        supabase.removeSubscription(sessionSubscription);
        sessionSubscription = null;
    }
    
    // Reset state
    currentSession = null;
    
    // Show session setup
    sessionSetup.style.display = 'block';
    votingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    sessionList.style.display = 'none';
    
    // Clear fields
    document.getElementById('sessionName').value = '';
}

// Show status message
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    
    // Clear after 5 seconds
    setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }, 5000);
}

// Initialize the app when the document is loaded
document.addEventListener('DOMContentLoaded', initApp);
