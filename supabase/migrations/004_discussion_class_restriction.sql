
-- Add subject_class_id to discussions
ALTER TABLE discussions ADD COLUMN IF NOT EXISTS subject_class_id UUID REFERENCES subject_classes(id) ON DELETE CASCADE;

-- Update RLS policies for discussions
-- First, drop existing ones
DROP POLICY IF EXISTS "Public read access for discussions" ON discussions;
DROP POLICY IF EXISTS "Authenticated users can create discussions" ON discussions;

-- SELECT policy: Users can see discussions if:
-- 1. They are the author
-- 2. They are the teacher of the subject class
-- 3. They are a student enrolled in the subject class
CREATE POLICY "Role-based read access for discussions" ON discussions
FOR SELECT TO authenticated
USING (
    auth.uid() = author_id 
    OR 
    EXISTS (
        SELECT 1 FROM subject_classes sc 
        WHERE sc.id = subject_class_id AND sc.teacher_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM student_subject_classes ssc
        WHERE ssc.subject_class_id = discussions.subject_class_id AND ssc.student_id = auth.uid()
    )
);

-- INSERT policy: Users can create discussions if:
-- 1. They are the teacher of the subject class
-- 2. They are a student enrolled in the subject class
CREATE POLICY "Role-based create access for discussions" ON discussions
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = author_id
    AND (
        EXISTS (
            SELECT 1 FROM subject_classes sc 
            WHERE sc.id = subject_class_id AND sc.teacher_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM student_subject_classes ssc
            WHERE ssc.subject_class_id = subject_class_id AND ssc.student_id = auth.uid()
        )
    )
);

-- UPDATE/DELETE policies (keep as is or refine)
-- Usually only authors can update/delete their own, which is already set
-- But let's refine them to be safe
DROP POLICY IF EXISTS "Authors can update their own discussions" ON discussions;
CREATE POLICY "Authors can update their own discussions" ON discussions
FOR UPDATE TO authenticated
USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete their own discussions" ON discussions;
CREATE POLICY "Authors can delete their own discussions" ON discussions
FOR DELETE TO authenticated
USING (auth.uid() = author_id);


-- Update RLS policies for discussion_replies
-- Users should only be able to see/create replies if they can see the discussion
DROP POLICY IF EXISTS "Public read access for replies" ON discussion_replies;
CREATE POLICY "Role-based read access for replies" ON discussion_replies
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM discussions d
        WHERE d.id = discussion_id
    )
);

DROP POLICY IF EXISTS "Authenticated users can create replies" ON discussion_replies;
CREATE POLICY "Role-based create access for replies" ON discussion_replies
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
        SELECT 1 FROM discussions d
        WHERE d.id = discussion_id
    )
);
