-- Add soft delete columns to discussions
ALTER TABLE discussions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE discussions ADD COLUMN IF NOT EXISTS deleted_by_role TEXT;

-- Update RLS policies to allow teachers/principals to soft-delete (update) discussions
-- First, allow update for teachers/principals in their subject classes
DROP POLICY IF EXISTS "Teachers can soft-delete discussions in their classes" ON discussions;
CREATE POLICY "Teachers can soft-delete discussions in their classes" ON discussions
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM subject_classes sc 
        WHERE sc.id = subject_class_id AND sc.teacher_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'principal'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM subject_classes sc 
        WHERE sc.id = subject_class_id AND sc.teacher_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'principal'
    )
);

-- Note: The author already has UPDATE access from "Authors can update their own discussions"
