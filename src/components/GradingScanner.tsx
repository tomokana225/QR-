import React, { useState, useEffect, useCallback } from 'react';
import { Student, GradingList, AppSettings } from '../types';
import { PlusIcon, TrashIcon, CameraIcon, CheckCircleIcon, ExclamationTriangleIcon } from './Icons';
import CameraScannerModal from './CameraScannerModal';

const GradingScanner: React.FC<{
    students: Student[];
    gradingLists: GradingList[];
    activeGradingListId: string | null;
    onSetActiveGradingListId: (listId: string) => void;
    onCreateGradingList: () => void;
    onDeleteGradingList: (listId: string) => void;
    onSetScore: (listId: string, studentId: string, score: string) => void;
    onUpdateListDetails: (listId: string, updates: Partial<GradingList>) => void;
    settings: AppSettings;
    onSettingsChange: (newSettings: Partial<AppSettings>) => void;
    playSuccessSound: () => void;
    audioRef: React.RefObject<HTMLAudioElement>;
}> = ({ students, gradingLists, activeGradingListId, onSetActiveGradingListId, onCreateGradingList, onDeleteGradingList, onSetScore, onUpdateListDetails, settings, onSettingsChange, playSuccessSound, audioRef }) => {
    const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [continuousScan, setContinuousScan] = useState(true);
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string }>({ type: 'success', message: '' });
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [selectedScore, setSelectedScore] = useState<string>('');
    const [scoresInput, setScoresInput] = useState('');

    const activeList = gradingLists.find(l => l.id === activeGradingListId);
    
    useEffect(() => {
        if (activeList) {
            setScoresInput(activeList.possibleScores.join(', '));
        }
    }, [activeList]);

    useEffect(() => {
        if (activeList?.possibleScores?.length && !selectedScore) {
            setSelectedScore(activeList.possibleScores[0]);
        }
        if (activeList && selectedScore && !activeList.possibleScores.includes(selectedScore)) {
            setSelectedScore(activeList.possibleScores[0] || '');
        }
    }, [activeList, selectedScore]);
    
    const handleScan = useCallback((student: Student) => {
        if (!activeGradingListId) {
            return { success: false, message: '有効な採点リストが選択されていません。'};
        }
        if (!selectedScore) {
             return { success: false, message: '採点する点数を選択してください。'};
        }

        onSetScore(activeGradingListId, student.id, selectedScore);
        playSuccessSound();
        return { success: true, message: `${student.name} さんを「${selectedScore}」で採点しました。`};
    }, [activeGradingListId, onSetScore, playSuccessSound, selectedScore]);


    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcodeInput.trim()) return;
        const student = students.find(s => s.randomCode === barcodeInput.trim());
        if (student) {
            const result = handleScan(student);
            setScanResult(result.success ? { type: 'success', message: result.message } : { type: 'error', message: result.message });

        } else {
            setScanResult({ type: 'error', message: '該当する生徒が見つかりませんでした。' });
        }
        if (continuousScan) setBarcodeInput('');
    };
    
    const handleScoresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setScoresInput(e.target.value);
    };

    const handleScoresBlur = () => {
        if (!activeGradingListId) return;
        const scores = scoresInput.split(',').map(s => s.trim()).filter(Boolean);
        onUpdateListDetails(activeGradingListId, { possibleScores: scores });
    };

    const handleExportCSV = () => {
        if (!activeList) return;
        const { scores } = activeList;
        const csvRows = [
            ['組', '番号', '氏名', '点数/評価']
        ];
        students.sort((a, b) => {
            if (a.className !== b.className) return a.className.localeCompare(b.className, undefined, { numeric: true });
            return parseInt(a.studentNumber) - parseInt(b.studentNumber);
        }).forEach(student => {
            const score = scores[student.id] || '';
            csvRows.push([student.className, student.studentNumber, student.name, score]);
        });

        const csvContent = "\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${activeList.name}_scores.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sortedLists = [...gradingLists].sort((a, b) => b.createdAt - a.createdAt);
    // FIX: Cast Set conversion to string[] to avoid unknown type inference during sort
    const classNames = ['all', ...([...new Set(students.map(s => s.className))] as string[]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
    const studentsToDisplay = students
        .filter(s => selectedClass === 'all' || s.className === selectedClass)
        .sort((a, b) => {
            if (a.className !== b.className) return a.className.localeCompare(b.className, undefined, { numeric: true });
            return parseInt(a.studentNumber) - parseInt(b.studentNumber);
        });

    if (gradingLists.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-semibold text-slate-700">採点リストがありません</h2>
                <button onClick={onCreateGradingList} className="mt-6 bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2 mx-auto"><PlusIcon className="w-5 h-5" /><span>新しい採点リストを作成</span></button>
            </div>
        );
    }
    
    return (
        <div>
             <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <select value={activeGradingListId || ''} onChange={e => onSetActiveGradingListId(e.target.value)} className="text-lg font-semibold p-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900 max-w-xs">
                        {sortedLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                    </select>
                     <div className="flex items-center gap-2">
                        <button onClick={onCreateGradingList} className="p-2 text-slate-500 hover:text-indigo-600"><PlusIcon className="w-5 h-5" /></button>
                        {activeGradingListId && <button onClick={() => onDeleteGradingList(activeGradingListId)} className="p-2 text-slate-500 hover:text-red-600"><TrashIcon className="w-5 h-5" /></button>}
                    </div>
                </div>
                 <button onClick={handleExportCSV} disabled={!activeList} className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50">Excel (CSV)でエクスポート</button>
            </div>
             {scanResult.message && (
                <div className={`flex items-center gap-3 p-4 mb-6 rounded-lg text-base font-semibold border ${scanResult.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                    {scanResult.type === 'success' ? <CheckCircleIcon className="w-6 h-6"/> : <ExclamationTriangleIcon className="w-6 h-6"/>}
                    <span>{scanResult.message}</span>
                </div>
            )}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">点数/評価の選択肢 (カンマ区切り)</label>
                        <input type="text" value={scoresInput} onChange={handleScoresChange} onBlur={handleScoresBlur} className="block w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900" placeholder="例: 100, 80, 60, C" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">スキャン時に記録する点数</label>
                        <select value={selectedScore} onChange={e => setSelectedScore(e.target.value)} className="block w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900" disabled={!activeList?.possibleScores.length}>
                            {activeList?.possibleScores.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow">
                    <form onSubmit={handleBarcodeSubmit}>
                        <label htmlFor="barcode-input-grading" className="block text-sm font-medium text-slate-700 mb-1">QRコードをスキャン</label>
                        <input type="text" id="barcode-input-grading" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} autoFocus className="block w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900" placeholder="ここにカーソルを合わせてください" />
                        <div className="mt-3 flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={continuousScan} onChange={(e) => setContinuousScan(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />連続スキャンモード</label>
                        </div>
                    </form>
                    <button 
                        onClick={() => {
                            if (audioRef.current && settings.playSound && settings.soundEffect !== 'none') {
                                audioRef.current.load();
                            }
                            setIsCameraScannerOpen(true);
                        }} 
                        className="w-full mt-4 bg-slate-700 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-800 flex items-center justify-center gap-2"
                    >
                        <CameraIcon className="w-5 h-5" /> カメラで一括スキャン
                    </button>
                </div>
            </div>
             <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">採点状況</h3>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="text-sm p-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900">
                         {classNames.map(cn => (
                           <option key={cn} value={cn}>
                               {cn === 'all' ? 'すべてのクラス' : `${cn}組`}
                           </option>
                       ))}
                    </select>
                </div>
                 <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 sticky top-0">
                            <tr>
                                <th className="p-3">クラス</th>
                                <th className="p-3">番号</th>
                                <th className="p-3">氏名</th>
                                <th className="p-3">点数/評価</th>
                            </tr>
                        </thead>
                        <tbody>
                           {studentsToDisplay.map(student => (
                                <tr key={student.id} className="border-b border-slate-100">
                                    <td className="p-2">{student.className}組</td>
                                    <td className="p-2">{student.studentNumber}番</td>
                                    <td className="p-2 font-medium">{student.name}</td>
                                    <td className="p-2">
                                        <select 
                                            value={activeList?.scores[student.id] || ''}
                                            onChange={e => activeGradingListId && onSetScore(activeGradingListId, student.id, e.target.value)}
                                            className="block w-full p-1.5 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900"
                                            disabled={!activeList?.possibleScores.length}
                                        >
                                            <option value="">-</option>
                                            {activeList?.possibleScores.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <CameraScannerModal
                isOpen={isCameraScannerOpen}
                onClose={async () => setIsCameraScannerOpen(false)}
                onScanStudent={handleScan}
                students={students}
                settings={settings}
                onSettingsChange={onSettingsChange}
                scannerId="qr-reader-grading"
                title={`QRコードスキャナー (${selectedScore}で採点中)`}
                activeList={activeList}
            />
        </div>
    );
};

export default GradingScanner;