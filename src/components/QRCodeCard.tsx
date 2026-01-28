import React from 'react';
import type { Student, LayoutSettings, LayoutElement } from '../types';

interface QRCodeCardProps {
    student: Student;
    layoutSettings: LayoutSettings;
    onDelete?: () => void;
    isPreview?: boolean;
    showCuttingLines?: boolean;
    isEditor?: boolean;
    activeElement?: string | null;
    onElementMouseDown?: (e: React.MouseEvent, key: keyof LayoutSettings['elements']) => void;
}

const XMarkIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
);

const QRCodeCard: React.FC<QRCodeCardProps> = ({ 
    student, 
    layoutSettings, 
    onDelete, 
    isPreview, 
    showCuttingLines, 
    isEditor,
    activeElement,
    onElementMouseDown 
}) => {

    const renderElement = (key: keyof LayoutSettings['elements'], content: React.ReactNode) => {
        const elSettings = layoutSettings.elements[key];
        if (!elSettings.visible) return null;

        const style: React.CSSProperties = {
            position: 'absolute',
            left: `${elSettings.x}px`,
            top: `${elSettings.y}px`,
            width: `${elSettings.width}px`,
            height: `${elSettings.height}px`,
            fontSize: elSettings.fontSize ? `${elSettings.fontSize}px` : undefined,
            textAlign: elSettings.textAlign,
            lineHeight: 1.2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            wordBreak: 'break-all',
        };
        
        const editorClasses = isEditor 
            ? `cursor-move border-2 ${activeElement === key ? 'border-indigo-500' : 'border-dashed border-slate-300 hover:border-slate-400'}` 
            : '';

        return (
            <div 
                style={style}
                className={editorClasses}
                onMouseDown={isEditor ? (e) => onElementMouseDown?.(e, key) : undefined}
            >
                {content}
            </div>
        );
    };

    const { elements, cardWidth, cardHeight } = layoutSettings;
    const qrSize = Math.round(elements.qrCode.width);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(student.randomCode)}`;

    return (
        <div 
            className={`relative bg-white break-inside-avoid border ${showCuttingLines ? 'print:border-dashed print:border-slate-400 border-dashed border-slate-300' : 'border-transparent'}`}
            style={{
                width: isEditor ? '100%' : `${cardWidth}px`,
                height: isEditor ? '100%' : `${cardHeight}px`,
                aspectRatio: isEditor ? `${cardWidth} / ${cardHeight}` : undefined,
                boxSizing: 'content-box',
            }}
        >
            {onDelete && !isPreview && (
                <button onClick={onDelete} className="absolute top-1 right-1 p-0.5 text-slate-400 hover:text-red-600 print:hidden z-20" aria-label={`Delete ${student.name}`}>
                    <XMarkIcon className="w-4 h-4" />
                </button>
            )}

            {renderElement('qrCode', <img src={qrCodeUrl} alt={`QR Code for ${student.name}`} className="w-full h-full object-contain" />)}
            
            {renderElement('name', <p className="w-full font-bold text-slate-800 whitespace-nowrap overflow-hidden">{student.name}</p>)}

            {renderElement('classInfo', <p className="w-full text-slate-600 whitespace-nowrap overflow-hidden">{student.className}組 {student.studentNumber}番</p>)}

            {renderElement('randomCode', <p className="w-full text-slate-500 font-mono overflow-hidden">{student.randomCode}</p>)}

        </div>
    );
};

export default QRCodeCard;