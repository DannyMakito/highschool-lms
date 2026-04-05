-- Discussions table
CREATE TABLE IF NOT EXISTS discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    read_by_users UUID[] DEFAULT '{}',
    subscribed_user_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discussion Replies table
CREATE TABLE IF NOT EXISTS discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes UUID[] DEFAULT '{}',
    read_by_users UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Authenticated users can read and write for now)
DROP POLICY IF EXISTS "Public read access for discussions" ON discussions;
CREATE POLICY "Public read access for discussions" ON discussions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can create discussions" ON discussions;
CREATE POLICY "Authenticated users can create discussions" ON discussions FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update their own discussions" ON discussions;
CREATE POLICY "Authors can update their own discussions" ON discussions FOR UPDATE TO authenticated USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete their own discussions" ON discussions;
CREATE POLICY "Authors can delete their own discussions" ON discussions FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Replies Policies
DROP POLICY IF EXISTS "Public read access for replies" ON discussion_replies;
CREATE POLICY "Public read access for replies" ON discussion_replies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can create replies" ON discussion_replies;
CREATE POLICY "Authenticated users can create replies" ON discussion_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update their own replies" ON discussion_replies;
CREATE POLICY "Authors can update their own replies" ON discussion_replies FOR UPDATE TO authenticated USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete their own replies" ON discussion_replies;
CREATE POLICY "Authors can delete their own replies" ON discussion_replies FOR DELETE TO authenticated USING (auth.uid() = author_id);
