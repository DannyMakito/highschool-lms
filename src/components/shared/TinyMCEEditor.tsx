import React from 'react';
import { RichTextEditor as TiptapEditor } from '@/components/editor/RichTextEditor';

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    height?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, height = 400 }) => {
    return (
        <div className="rich-text-editor border rounded-md overflow-hidden bg-white">
            <TiptapEditor
                content={value}
                onChange={onChange}
                minHeight={`${height}px`}
                className="rounded-md border-0 shadow-none"
            />
        </div>
    );
};

export default RichTextEditor;
