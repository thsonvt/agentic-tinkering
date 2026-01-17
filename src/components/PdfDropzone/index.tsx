import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from 'convex/react';
import { useHistory } from '@docusaurus/router';
import { api } from '../../../convex/_generated/api';
import { extractPdfToMarkdown } from '@site/src/utils/pdfImport';
import styles from './styles.module.css';

interface PdfDropzoneProps {
    onClose?: () => void;
}

export default function PdfDropzone({ onClose }: PdfDropzoneProps): React.ReactNode {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const createContent = useMutation(api.content.create);
    const history = useHistory();

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (!file) return;

            if (!file.name.toLowerCase().endsWith('.pdf')) {
                setError('Please upload a PDF file.');
                return;
            }

            setIsProcessing(true);
            setError(null);

            try {
                const { title, content } = await extractPdfToMarkdown(file);

                const contentId = await createContent({
                    title,
                    content,
                    description: `Imported from PDF: ${file.name}`,
                    contentType: 'doc',
                });

                // Navigate to the new draft for editing
                history.push(`/drafts/edit?id=${contentId}`);
                onClose?.();
            } catch (err) {
                console.error('PDF import failed:', err);
                setError(err instanceof Error ? err.message : 'Failed to import PDF');
            } finally {
                setIsProcessing(false);
            }
        },
        [createContent, history, onClose]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false,
        disabled: isProcessing,
    });

    return (
        <div className={styles.container}>
            <div
                {...getRootProps()}
                className={`${styles.dropzone} ${isDragActive ? styles.active : ''} ${isProcessing ? styles.processing : ''}`}>
                <input {...getInputProps()} />
                {isProcessing ? (
                    <div className={styles.processing}>
                        <div className={styles.spinner} />
                        <p>Processing PDF...</p>
                    </div>
                ) : isDragActive ? (
                    <p>Drop the PDF here...</p>
                ) : (
                    <>
                        <div className={styles.icon}>📄</div>
                        <p>Drag & drop a PDF here, or click to select</p>
                        <span className={styles.hint}>The PDF will be converted to Markdown</span>
                    </>
                )}
            </div>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
