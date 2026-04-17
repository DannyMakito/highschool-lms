import supabase from '../src/lib/supabase.ts'; // Corrected path

async function checkDiscussions() {
    try {
        const { data, error } = await supabase.from('discussions').select('*').limit(1);
        if (error) {
            console.error('Error fetching discussions:', error);
        } else {
            console.log('Columns in discussions:', data[0] ? Object.keys(data[0]) : 'No data found to check columns');
        }
        
        const { data: replies, error: rError } = await supabase.from('discussion_replies').select('*').limit(1);
        if (rError) {
            console.error('Error fetching replies:', rError);
        } else {
            console.log('Columns in discussion_replies:', replies[0] ? Object.keys(replies[0]) : 'No data found to check columns');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkDiscussions();
