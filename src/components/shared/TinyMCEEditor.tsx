import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface RichTextEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    height?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, height = 400 }) => {
    return (
        <div className="rich-text-editor border rounded-md overflow-hidden bg-white">
            <Editor
                apiKey="39g8kyywqqr6kg7zss6exyfys11z3vbmz9wxs1va036l7ds0"
                init={{
                    height: height,
                    menubar: false,
                    plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount', 'emoticons'
                    ],
                    toolbar: 'undo redo | fontfamily fontsize blocks | ' +
                        'bold italic underline forecolor backcolor | link image media table | ' +
                        'align bullist numlist | removeformat | charmap emoticons | preview code fullscreen',
                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; }',
                    placeholder: placeholder,
                    branding: false,
                    statusbar: true,
                    elementpath: false,
                    promotion: false,
                    skin: 'oxide',
                    content_css: 'default',
                }}
                value={value}
                onEditorChange={onChange}
            />
        </div>
    );
};

export default RichTextEditor;
