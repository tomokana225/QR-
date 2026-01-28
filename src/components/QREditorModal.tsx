import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Student, LayoutSettings, LayoutElement } from '../types';
import QRCodeCard from './QRCodeCard';
import { ArrowsPointingOutIcon } from './Icons';

type ElementKey = keyof LayoutSettings['elements'];

const QREditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    initialLayoutSettings: LayoutSettings;
    onSave: (settings: LayoutSettings) => void;
}> = ({ isOpen, onClose, initialLayoutSettings, onSave }) => {
    
    const [settings, setSettings] = useState(initialLayoutSettings);
    const [activeElementKey, setActiveElementKey] = useState<ElementKey | null>(null);
    
    const [actionState, setActionState] = useState<{
        action: 'move' | 'resize';
        key: ElementKey;
        startX: number;
        startY: number;
        elementStartX: number;
        elementStartY: number;
        elementStartWidth: number;
        elementStartHeight: number;
    } | null>(null);

    const editorRef = useRef<HTMLDivElement>(null);

    const sampleStudent: Student = { id: 'sample', name: '山田 太郎', className: '1', studentNumber: '99', randomCode: 'AbCd1234' };

    const handleSave = () => {
        onSave(settings);
    };

    const handleElementMouseDown = (e: React.MouseEvent, key: ElementKey) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveElementKey(key);
        setActionState({
            action: 'move',
            key,
            startX: e.clientX,
            startY: e.clientY,
            elementStartX: settings.elements[key].x,
            elementStartY: settings.elements[key].y,
            elementStartWidth: settings.elements[key].width,
            elementStartHeight: settings.elements[key].height,
        });
    };
    
    const handleResizeMouseDown = (e: React.MouseEvent, key: ElementKey) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveElementKey(key);
        setActionState({
            action: 'resize',
            key,
            startX: e.clientX,
            startY: e.clientY,
            elementStartX: settings.elements[key].x,
            elementStartY: settings.elements[key].y,
            elementStartWidth: settings.elements[key].width,
            elementStartHeight: settings.elements[key].height,
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!actionState || !editorRef.current) return;
        
        const editorBounds = editorRef.current.getBoundingClientRect();
        const scale = editorBounds.width / settings.cardWidth;

        const deltaX = (e.clientX - actionState.startX) / scale;
        const deltaY = (e.clientY - actionState.startY) / scale;

        setSettings(prev => {
            const newSettings = { ...prev, elements: { ...prev.elements } };
            const element = { ...prev.elements[actionState.key] };

            if (actionState.action === 'move') {
                element.x = Math.round(actionState.elementStartX + deltaX);
                element.y = Math.round(actionState.elementStartY + deltaY);
            } else if (actionState.action === 'resize') {
                element.width = Math.max(10, Math.round(actionState.elementStartWidth + deltaX));
                element.height = Math.max(10, Math.round(actionState.elementStartHeight + deltaY));
                 if (element.fontSize) {
                    element.fontSize = Math.max(8, Math.round(element.height * 0.8));
                }
            }
            
            newSettings.elements[actionState.key] = element;
            return newSettings;
        });

    }, [actionState, settings.cardWidth]);

    const handleMouseUp = useCallback(() => {
        setActionState(null);
    }, []);

    useEffect(() => {
        if (actionState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [actionState, handleMouseMove, handleMouseUp]);

    const handleSettingsChange = <K extends keyof LayoutElement>(key: ElementKey, prop: K, value: LayoutElement[K]) => {
        setSettings(prev => ({
            ...prev,
            elements: {
                ...prev.elements,
                [key]: {
                    ...prev.elements[key],
                    [prop]: value,
                },
            },
        }));
    };
    
    if (!isOpen) return null;

    const renderElementEditor = (key: ElementKey, label: string) => {
        const el = settings.elements[key];
        return (
             <div key={key} className={`p-3 rounded-md transition-colors ${activeElementKey === key ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                <label className="flex items-center gap-2 font-semibold text-slate-800">
                    <input
                        type="checkbox"
                        checked={el.visible}
                        onChange={e => handleSettingsChange(key, 'visible', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {label}
                </label>
                {el.visible && el.textAlign && (
                     <div className="mt-2 text-xs">
                        <span className="font-medium mr-2">文字揃え:</span>
                        {(['left', 'center', 'right'] as const).map(align => (
                            <label key={align} className="mr-2">
                                <input
                                    type="radio"
                                    name={`${key}-align`}
                                    value={align}
                                    checked={el.textAlign === align}
                                    onChange={() => handleSettingsChange(key, 'textAlign', align)}
                                    className="mr-1"
                                />
                                {{left: '左', center: '中', right: '右'}[align]}
                            </label>
                        ))}
                    </div>
                )}
             </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onMouseDown={onClose}>
            <div className="bg-slate-100 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col m-4" onMouseDown={e => e.stopPropagation()}>
                <div className="p-4 border-b bg-white rounded-t-lg flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">レイアウトエディタ</h2>
                     <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">キャンセル</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">保存して適用</button>
                    </div>
                </div>
                <div className="flex-grow flex p-4 gap-4 overflow-hidden">
                    <main className="flex-grow bg-gray-200 rounded-lg flex items-center justify-center p-4">
                        <div ref={editorRef} className="shadow-lg">
                            <div 
                                className="relative bg-white select-none" 
                                style={{ width: settings.cardWidth, height: settings.cardHeight }}
                                onMouseDown={() => setActiveElementKey(null)}
                            >
                                {(Object.keys(settings.elements) as ElementKey[]).map(key => {
                                    const el = settings.elements[key];
                                    if (!el.visible) return null;

                                    const style: React.CSSProperties = {
                                        position: 'absolute',
                                        left: `${el.x}px`, top: `${el.y}px`,
                                        width: `${el.width}px`, height: `${el.height}px`,
                                    };
                                    
                                    let content;
                                    const textStyle = { fontSize: `${el.fontSize}px`, textAlign: el.textAlign, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap' } as React.CSSProperties;
                                    if(key === 'qrCode') {
                                        const qrSize = Math.round(el.width);
                                        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(sampleStudent.randomCode)}`;
                                        content = <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />;
                                    } else if (key === 'name') {
                                        content = <p style={textStyle} className="w-full font-bold text-slate-800">{sampleStudent.name}</p>;
                                    } else if (key === 'classInfo') {
                                        content = <p style={textStyle} className="w-full text-slate-600">{sampleStudent.className}組 {sampleStudent.studentNumber}番</p>;
                                    } else if (key === 'randomCode') {
                                        content = <p style={textStyle} className="w-full text-slate-500 font-mono">{sampleStudent.randomCode}</p>;
                                    }

                                    return (
                                        <div
                                            key={key}
                                            style={style}
                                            className={`cursor-move border-2 transition-colors ${activeElementKey === key ? 'border-indigo-500' : 'border-dashed border-transparent hover:border-slate-300'}`}
                                            onMouseDown={(e) => handleElementMouseDown(e, key)}
                                        >
                                            <div className="relative w-full h-full flex items-center">{content}</div>
                                            {activeElementKey === key && (
                                                <div 
                                                    className="absolute -right-1 -bottom-1 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full cursor-se-resize"
                                                    onMouseDown={(e) => handleResizeMouseDown(e, key)}
                                                >
                                                   <ArrowsPointingOutIcon className="w-3 h-3 text-indigo-500 -rotate-45" />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </main>
                    <aside className="w-72 bg-white rounded-lg p-4 space-y-4 overflow-y-auto">
                        <h3 className="text-lg font-semibold text-slate-800">要素の表示設定</h3>
                        {renderElementEditor('qrCode', 'QRコード')}
                        {renderElementEditor('name', '氏名')}
                        {renderElementEditor('classInfo', '組・番号')}
                        {renderElementEditor('randomCode', 'ランダムコード')}
                        <div className="pt-4 border-t">
                             <h3 className="text-lg font-semibold text-slate-800 mb-2">カードサイズ</h3>
                             <div className="grid grid-cols-2 gap-2 text-sm">
                                 <div>
                                     <label htmlFor="cardWidth" className='font-medium'>幅 (px)</label>
                                     <input type="number" id="cardWidth" value={settings.cardWidth} onChange={e => setSettings(s => ({...s, cardWidth: parseInt(e.target.value)}))} className="w-full p-1 border border-slate-300 rounded-md mt-1"/>
                                 </div>
                                  <div>
                                     <label htmlFor="cardHeight" className='font-medium'>高さ (px)</label>
                                     <input type="number" id="cardHeight" value={settings.cardHeight} onChange={e => setSettings(s => ({...s, cardHeight: parseInt(e.target.value)}))} className="w-full p-1 border border-slate-300 rounded-md mt-1"/>
                                 </div>
                             </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default QREditorModal;