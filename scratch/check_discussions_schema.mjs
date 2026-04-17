import supabase from './src/lib/supabase.js';

async function checkDiscussions() {
    const { data, error } = await supabase.from('discussions').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log('Columns in discussions:', Object.keys(data[0] || {}));
    }
    
    const { data: replies, error: rError } = await supabase.from('discussion_replies').select('*').limit(1);
    if (rError) {
        console.error(rError);
    } else {
        console.log('Columns in discussion_replies:', Object.keys(replies[0] || {}));
    }
}

checkDiscussions();
