import React, { useState, useEffect } from 'react';
import { Student, LayoutSettings } from '../types';
import { PrinterIcon } from './Icons';
import QRCodeCard from './QRCodeCard';
import QREditorModal from './QREditorModal';

const QRGenerator: React.FC<{ students: Student[] }> = ({ students }) => {
    const [zoom, setZoom] = useState(0.7);
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(() => {
        const savedSettings = localStorage.getItem('qrLayoutSettings');
        if (savedSettings) {
            try {
                // Add default margins if they don't exist in saved settings for backward compatibility
                const parsed = JSON.parse(savedSettings);
                return {
                    marginTop: 10,
                    marginBottom: 10,
                    marginLeft: 10,
                    marginRight: 10,
                    ...parsed,
                };
            } catch (e) {
                console.error("Failed to parse saved layout settings", e);
            }
        }
        return {
            columns: 3,
            paperSize: 'A4',
            showCuttingLines: false,
            cardWidth: 220,
            cardHeight: 125,
            marginTop: 10,
            marginBottom: 10,
            marginLeft: 10,
            marginRight: 10,
            elements: {
                qrCode: { x: 10, y: 12, width: 100, height: 100, visible: true },
                name: { x: 120, y: 32, width: 90, height: 24, visible: true, fontSize: 16, textAlign: 'left' },
                classInfo: { x: 120, y: 62, width: 90, height: 20, visible: true, fontSize: 14, textAlign: 'left' },
                randomCode: { x: 10, y: 106, width: 100, height: 16, visible: false, fontSize: 10, textAlign: 'center' },
            },
        };
    });
    
    useEffect(() => {
        localStorage.setItem('qrLayoutSettings', JSON.stringify(layoutSettings));
    }, [layoutSettings]);

    // FIX: Cast to string[] to avoid unknown type inference during sort
    const classNames = ['all', ...([...new Set(students.map(s => s.className))] as string[]).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }))];

    useEffect(() => {
        if (!classNames.includes(selectedClass)) setSelectedClass('all');
    }, [classNames, selectedClass]);
    
    const handleLayoutChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setLayoutSettings(prev => ({ ...prev, [name]: checked }));
        } else {
            const isNumeric = ['columns', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight'].includes(name);
            const val = isNumeric ? (value === '' ? 0 : parseInt(value, 10)) : value;
            setLayoutSettings(prev => ({ ...prev, [name]: val as any }));
        }
    };

    const filteredStudents = students.filter(s => {
        if (selectedClass === 'all') return true;
        return s.className === selectedClass;
    });

    if (students.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-semibold text-slate-700">名簿に生徒がいません</h2>
                <p className="text-slate-500 mt-2">先に「名簿登録」モードで生徒を登録してください。</p>
            </div>
        );
    }
    
    const columnClasses: { [key: number]: string } = {1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8'};
    const printColumnClasses: { [key: number]: string } = {1: 'print:grid-cols-1', 2: 'print:grid-cols-2', 3: 'print:grid-cols-3', 4: 'print:grid-cols-4', 5: 'print:grid-cols-5', 6: 'print:grid-cols-6', 7: 'print:grid-cols-7', 8: 'print:grid-cols-8'};
    
    const paperStyles = {
        A4: { width: '210mm', minHeight: '297mm' },
        letter: { width: '8.5in', minHeight: '11in' },
    };

    const printStyles = `
        @media print {
            @page {
                size: ${layoutSettings.paperSize};
                margin: ${layoutSettings.marginTop}mm ${layoutSettings.marginRight}mm ${layoutSettings.marginBottom}mm ${layoutSettings.marginLeft}mm;
            }
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0;
            }
            .qr-print-area {
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                background-color: transparent !important;
            }
            .qr-print-paper {
                transform: scale(1) !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                min-height: 0 !important;
                width: 100% !important;
                height: 100% !important;
            }
        }
    `;

    return (
        <>
            <style>{printStyles}</style>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 print:hidden">
                    <div className="bg-white p-6 rounded-lg shadow sticky top-6 space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-3 text-slate-800">操作</h2>
                            <button onClick={() => window.print()} className="w-full bg-slate-700 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-800 flex items-center justify-center gap-2">
                                <PrinterIcon className="w-5 h-5" />
                                <span>
                                    {selectedClass === 'all' ? `すべて印刷 (${filteredStudents.length}人)` : `${selectedClass}組を印刷 (${filteredStudents.length}人)`}
                                </span>
                            </button>
                        </div>
                         <div>
                            <h2 className="text-lg font-semibold mb-2 text-slate-800">表示クラスの選択</h2>
                            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="block w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900">
                               {classNames.map(cn => (
                                   <option key={cn} value={cn}>
                                       {cn === 'all' ? 'すべてのクラス' : `${cn}組`}
                                   </option>
                               ))}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <div className='border-t pt-4'>
                                <h3 className="text-lg font-semibold mb-2 text-slate-800">カードレイアウト</h3>
                                <button onClick={() => setIsEditorOpen(true)} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700">
                                    レイアウトを編集
                                </button>
                            </div>
                            <div className='border-t pt-4'>
                                <h3 className="text-lg font-semibold mb-2 text-slate-800">用紙・余白設定</h3>
                                <div className='grid grid-cols-2 gap-4 text-sm'>
                                    <div>
                                        <label htmlFor="paperSize" className="block font-medium text-slate-700 mb-1">用紙サイズ</label>
                                        <select id="paperSize" name="paperSize" value={layoutSettings.paperSize} onChange={handleLayoutChange} className="block w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900">
                                            <option value="A4">A4</option>
                                            <option value="letter">レター</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block font-medium text-slate-700 mb-1">余白 (mm)</label>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                            <div><label htmlFor="marginTop" className='text-xs'>上</label><input type="number" name="marginTop" id="marginTop" value={layoutSettings.marginTop} onChange={handleLayoutChange} className="w-full p-1 border border-slate-300 rounded"/></div>
                                            <div><label htmlFor="marginBottom" className='text-xs'>下</label><input type="number" name="marginBottom" id="marginBottom" value={layoutSettings.marginBottom} onChange={handleLayoutChange} className="w-full p-1 border border-slate-300 rounded"/></div>
                                            <div><label htmlFor="marginLeft" className='text-xs'>左</label><input type="number" name="marginLeft" id="marginLeft" value={layoutSettings.marginLeft} onChange={handleLayoutChange} className="w-full p-1 border border-slate-300 rounded"/></div>
                                            <div><label htmlFor="marginRight" className='text-xs'>右</label><input type="number" name="marginRight" id="marginRight" value={layoutSettings.marginRight} onChange={handleLayoutChange} className="w-full p-1 border border-slate-300 rounded"/></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='border-t pt-4'>
                                <h3 className="text-lg font-semibold mb-2 text-slate-800">印刷オプション</h3>
                                <div className='grid grid-cols-2 gap-4 text-sm'>
                                    <div>
                                        <label htmlFor="columns" className="block font-medium text-slate-700 mb-1">印刷時の列数</label>
                                        <select id="columns" name="columns" value={layoutSettings.columns} onChange={handleLayoutChange} className="block w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900">
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(c => <option key={c} value={c}>{c}列</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showCuttingLines" checked={layoutSettings.showCuttingLines} onChange={handleLayoutChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />切り取り線を印刷する</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="md:col-span-2">
                    <div 
                        className="p-6 bg-gray-200 rounded-lg shadow-inner print:shadow-none print:p-0 print:bg-transparent qr-print-area" 
                    >
                        <div 
                            className="bg-white shadow-lg print:shadow-none qr-print-paper"
                            style={{ 
                                ...paperStyles[layoutSettings.paperSize],
                                padding: `${layoutSettings.marginTop}mm ${layoutSettings.marginRight}mm ${layoutSettings.marginBottom}mm ${layoutSettings.marginLeft}mm`,
                                boxSizing: 'content-box',
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top left',
                            }}
                        >
                            <div className={`grid ${columnClasses[layoutSettings.columns]} ${printColumnClasses[layoutSettings.columns]} gap-0`}>
                                {filteredStudents.sort((a,b) => {
                                    if (a.className !== b.className) return a.className.localeCompare(b.className, undefined, { numeric: true });
                                    return parseInt(a.studentNumber, 10) - parseInt(b.studentNumber, 10);
                                }).map(student => (
                                    <QRCodeCard 
                                        key={student.id} 
                                        student={student}
                                        layoutSettings={layoutSettings}
                                        isPreview={true}
                                        showCuttingLines={layoutSettings.showCuttingLines}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                     <div className="fixed bottom-4 right-4 bg-white p-2 rounded-lg shadow-xl print:hidden">
                        <label className="text-sm">表示倍率: </label>
                        <input type="range" min="0.2" max="1.5" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
                    </div>
                </div>
                {isEditorOpen && (
                    <QREditorModal
                        isOpen={isEditorOpen}
                        onClose={() => setIsEditorOpen(false)}
                        initialLayoutSettings={layoutSettings}
                        onSave={(newSettings) => {
                            setLayoutSettings(newSettings);
                            setIsEditorOpen(false);
                        }}
                    />
                )}
            </div>
        </>
    );
};

export default QRGenerator;