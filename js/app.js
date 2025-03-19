document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const createSessionBtn = document.getElementById('create-session');
    const joinSessionBtn = document.getElementById('join-session');
    const usernameInput = document.getElementById('username');
    const sessionIdInput = document.getElementById('session-id');

    // Generate a random session ID
    function generateSessionId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Create new session
    createSessionBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        if (!username) {
            alert('Please enter your name');
            return;
        }

        const sessionId = generateSessionId();
        const userId = Math.random().toString(36).substring(2, 10);

        try {
            // Create session in Supabase
            const { error: sessionError } = await supabase
                .from('sessions')
                .insert([
                    { 
                        id: sessionId, 
                        created_at: new Date(),
                        status: 'waiting',
                        time_limit: 30 // seconds
                    }
                ]);
                
            if (sessionError) throw sessionError;
            
            // Add user as participant
            const { error: participantError } = await supabase
                .from('participants')
                .insert([
                    { 
                        user_id: userId,
                        session_id: sessionId,
                        name: username,
                        joined_at: new Date(),
                        voted: false,
                        is_host: true
                    }
                ]);
                
            if (participantError) throw participantError;
            
            // Store user info in localStorage
            localStorage.setItem('username', username);
            localStorage.setItem('userId', userId);
            
            // Redirect to session page
            window.location.href = `session.html?id=${sessionId}`;
            
        } catch (error) {
            console.error('Error creating session:', error);
            alert('Error creating session. Please try again.');
        }
    });

    // Join existing session
    joinSessionBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        const sessionId = sessionIdInput.value.trim().toUpperCase();
        
        if (!username || !sessionId) {
            alert('Please enter your name and session ID');
            return;
        }

        try {
            // Check if session exists
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .select('id')
                .eq('id', sessionId)
                .single();
                
            if (sessionError || !sessionData) {
                alert('Session not found');
                return;
            }
            
            const userId = Math.random().toString(36).substring(2, 10);
            
            // Add user to participants
            const { error: participantError } = await supabase
                .from('participants')
                .insert([
                    {
                        user_id: userId,
                        session_id: sessionId,
                        name: username,
                        joined_at: new Date(),
                        voted: false,
                        is_host: false
                    }
                ]);
                
            if (participantError) throw participantError;
            
            // Store user info in localStorage
            localStorage.setItem('username', username);
            localStorage.setItem('userId', userId);
            
            // Redirect to session page
            window.location.href = `session.html?id=${sessionId}`;
            
        } catch (error) {
            console.error('Error joining session:', error);
            alert('Error joining session. Please try again.');
        }
    });
});
