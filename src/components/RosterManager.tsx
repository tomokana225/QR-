import React, { useState, useMemo, useEffect } from 'react';
import { Student, AppSettings } from '../types';
import { SparklesIcon, XMarkIcon, TrashIcon, PencilSquareIcon, CameraIcon, QrCodeIcon, ArrowPathIcon, ChevronRightIcon } from './Icons';
import EditStudentModal from './EditStudentModal';
import CameraScannerModal from './CameraScannerModal';

const RosterManager: React.FC<{
    students: Student[];
    selectedStudentIds: Set<string>;
    setSelectedStudentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    onAddStudent: (student: { className: string; studentNumber: string; name: string; randomCode?: string }) => void;
    onUpdateStudent: (student: Student) => void;
    onBulkAddStudents: (students: Omit<Student, 'id' | 'randomCode'>[]) => number;
    onDeleteStudent: (id: string) => void;
    onDeleteSelectedStudents: () => void;
}> = ({ students, selectedStudentIds, setSelectedStudentIds, onAddStudent, onUpdateStudent, onBulkAddStudents, onDeleteStudent, onDeleteSelectedStudents }) => {
    const [className, setClassName] = useState('');
    const [studentNumber, setStudentNumber] = useState('');
    const [name, setName] = useState('');
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [bulkText, setBulkText] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    
    // スキャン機能用の状態
    const [scanMode, setScanMode] = useState<{
        type: 'none' | 'single' | 'bulk';
        targetId?: string; // single用
        queue?: Student[]; // bulk用
        currentIndex?: number; // bulk用
    }>({ type: 'none' });

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    
    // 編集モーダル用の状態
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    // モバイルメニュー（フォーム）の開閉状態
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    useEffect(() => {
        // デスクトップならデフォルトで開く、モバイルなら閉じる
        setIsMenuOpen(window.innerWidth >= 1024);
    }, []);

    // ダミー設定（スキャナー用）
    const scannerSettings: AppSettings = {
        volume: 1, isCameraFlipped: false, soundEffect: 'ping', scannerBoxSize: 200, scannerHighRes: false,
        customSound: null, playSound: true, cameraViewSize: 'medium', cameraZoom: 1, scanCooldown: 1000,
        syncApiKey: '', syncId: '', lastSyncTimestamp: null
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!className || !studentNumber || !name) return;
        
        onAddStudent({ 
            className, 
            studentNumber, 
            name,
            randomCode: undefined
        });
        
        setStudentNumber((parseInt(studentNumber)+1).toString());
        setName('');
    };

    const handleBulkAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const lines = bulkText.trim().split('\n');
        const newStudents = lines.map(line => {
            const [cn, sn, n] = line.split('\t').map(p => p?.trim());
            return cn && sn && n ? { className: cn, studentNumber: sn, name: n } : null;
        }).filter(Boolean) as any[];
        if (newStudents.length > 0) {
            onBulkAddStudents(newStudents);
            setBulkText('');
            alert(`${newStudents.length}名の生徒を追加しました。`);
        }
    };

    const studentsToDisplay = useMemo(() => {
        return students.filter(s => selectedClass === 'all' || s.className === selectedClass)
        .sort((a,b) => {
            if (a.className !== b.className) return a.className.localeCompare(b.className, undefined, {numeric:true});
            return parseInt(a.studentNumber) - parseInt(b.studentNumber);
        });
    }, [students, selectedClass]);

    const startSingleLink = (student: Student) => {
        setScanMode({ type: 'single', targetId: student.id });
        setIsScannerOpen(true);
    };

    const startBulkLink = () => {
        if (studentsToDisplay.length === 0) return;
        setScanMode({ type: 'bulk', queue: studentsToDisplay, currentIndex: 0 });
        setIsScannerOpen(true);
    };

    const handleScanCode = (code: string) => {
        if (scanMode.type === 'single' && scanMode.targetId) {
            const student = students.find(s => s.id === scanMode.targetId);
            if (student) {
                onUpdateStudent({ ...student, randomCode: code });
                setIsScannerOpen(false);
                setScanMode({ type: 'none' });
            }
        } else if (scanMode.type === 'bulk' && scanMode.queue && scanMode.currentIndex !== undefined) {
            const student = scanMode.queue[scanMode.currentIndex];
            if (student) {
                onUpdateStudent({ ...student, randomCode: code });
                const nextIndex = scanMode.currentIndex + 1;
                if (nextIndex < scanMode.queue.length) {
                    setScanMode(prev => ({ ...prev, currentIndex: nextIndex }));
                } else {
                    setIsScannerOpen(false);
                    setScanMode({ type: 'none' });
                    alert('表示されている全ての生徒の紐付けが完了しました。');
                }
            }
        }
    };

    const getScannerTitle = () => {
        if (scanMode.type === 'single') {
            const s = students.find(st => st.id === scanMode.targetId);
            return s ? `QR紐付け: ${s.name}` : 'QR紐付け';
        }
        if (scanMode.type === 'bulk' && scanMode.queue && scanMode.currentIndex !== undefined) {
            const s = scanMode.queue[scanMode.currentIndex];
            return `QR一括紐付け (${scanMode.currentIndex + 1}/${scanMode.queue.length}): ${s.name}`;
        }
        return 'QRコードスキャン';
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full">
            {/* Mobile Toggle Button */}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center text-slate-700 font-bold active:bg-slate-50 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <PencilSquareIcon className="w-5 h-5 text-indigo-500" />
                    生徒登録・編集メニュー
                </span>
                <ChevronRightIcon className={`w-5 h-5 transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Registration Form */}
            <div className={`w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 transition-all duration-300 ${isMenuOpen ? 'block' : 'hidden lg:flex'}`}>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                        <button onClick={() => setMode('single')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>個別</button>
                        <button onClick={() => setMode('bulk')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>一括</button>
                    </div>

                    {mode === 'single' ? (
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">クラス</label>
                                <input type="text" value={className} onChange={e => setClassName(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="1" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">出席番号</label>
                                <input type="number" inputMode="numeric" value={studentNumber} onChange={e => setStudentNumber(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="10" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">氏名</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="山田 太郎" required />
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mt-2">
                                <SparklesIcon className="w-4 h-4" /> 登録
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleBulkAdd} className="space-y-4">
                            <p className="text-[10px] text-slate-500">Excelの[クラス/番号/名前]列を貼り付け</p>
                            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} className="w-full h-48 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="1	1	山田 太郎" />
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                一括追加実行
                            </button>
                        </form>
                    )}
                </div>

                {selectedStudentIds.size > 0 && (
                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col gap-3">
                        <p className="text-red-700 text-sm font-bold">{selectedStudentIds.size}名を操作中</p>
                        <button onClick={onDeleteSelectedStudents} className="w-full bg-red-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-700">
                            <TrashIcon className="w-4 h-4" /> 選択削除
                        </button>
                    </div>
                )}
            </div>

            {/* Student List */}
            <div className="flex-grow bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[300px]">
                <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
                    <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                        登録生徒一覧
                        <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{studentsToDisplay.length}名</span>
                    </h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={startBulkLink}
                            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                            disabled={studentsToDisplay.length === 0}
                            title="表示中の生徒に対して、上から順にQRコードを読み取って紐付けます"
                        >
                            <QrCodeIcon className="w-4 h-4" />
                            QR一括紐付け
                        </button>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 text-xs font-bold bg-slate-100 border-none rounded-lg outline-none cursor-pointer">
                            <option value="all">全クラス</option>
                            {(Array.from(new Set(students.map(s => s.className))) as string[]).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(c => (
                                <option key={c} value={c}>{c}組</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-2">
                    {studentsToDisplay.map(s => (
                        <div key={s.id} className={`flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl transition-all border ${selectedStudentIds.has(s.id) ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                            <input 
                                type="checkbox" 
                                checked={selectedStudentIds.has(s.id)} 
                                onChange={() => setSelectedStudentIds(prev => {
                                    const next = new Set(prev);
                                    if(next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                    return next;
                                })}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                            />
                            <div className="flex-grow min-w-0">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded whitespace-nowrap">{s.className}-{s.studentNumber}</span>
                                        <span className="text-sm font-bold text-slate-800 truncate">{s.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <QrCodeIcon className="w-3 h-3 text-slate-300" />
                                        <span className="text-[10px] font-mono text-slate-400">{s.randomCode}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button 
                                    onClick={() => startSingleLink(s)}
                                    className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                                    title="QRコードを紐付け・再設定"
                                >
                                    <QrCodeIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => setEditingStudent(s)} 
                                    className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                                    title="編集"
                                >
                                    <PencilSquareIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => onDeleteStudent(s.id)} 
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    title="削除"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {studentsToDisplay.length === 0 && <p className="text-center text-slate-400 text-sm py-20">生徒が登録されていません</p>}
                </div>
            </div>

            {/* Edit Modal */}
            <EditStudentModal 
                isOpen={!!editingStudent}
                onClose={() => setEditingStudent(null)}
                onSave={onUpdateStudent}
                student={editingStudent}
            />

            {/* QR Scanner Modal for Linking */}
            <CameraScannerModal 
                isOpen={isScannerOpen}
                onClose={async () => {
                    setIsScannerOpen(false);
                    setScanMode({ type: 'none' });
                }}
                onScanCode={handleScanCode}
                students={students}
                settings={scannerSettings}
                onSettingsChange={() => {}}
                scannerId="qr-linker-scanner"
                title={getScannerTitle()}
            />
        </div>
    );
};

export default RosterManager;