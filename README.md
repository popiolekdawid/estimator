# Team Estimator

A simple web application for team task time estimation that solves common problems with estimation sessions:

1. Synchronization - People can't see others' estimates until everyone has voted
2. Fairness - Uses median calculation to prevent outliers from skewing the results

## Features

- Anonymous voting
- Countdown timer for voting sessions
- Fair estimate averaging using median
- Real-time updates using Supabase

## Setup

1. Clone this repository
2. Create a Supabase project at https://supabase.com
3. Run the SQL script from the `sql` directory to create the necessary tables
4. Update `js/supabase-config.js` with your Supabase URL and anonymous key
5. Deploy to any static web hosting (such as GitHub Pages)

## How to Use

1. First user creates a session
2. Share the session ID with team members
3. Everyone joins the session
4. Start the voting when everyone is ready
5. Each team member submits their time estimate
6. Once all votes are in, the system calculates and displays the final estimate
