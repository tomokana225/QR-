import React from 'react';
import { Student, SubmissionList, GradingList } from '../types';
import { XMarkIcon, PrinterIcon } from './Icons';

const StudentReportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    submissionLists: SubmissionList[];
    gradingLists: GradingList[];
}> = ({ isOpen, onClose, student, submissionLists, gradingLists }) => {
    
    if (!isOpen || !student) return null;

    const handlePrint = () => {
        window.print();
    };

    const sortedSubmissionLists = [...submissionLists].sort((a, b) => a.createdAt - b.createdAt);
    const sortedGradingLists = [...gradingLists].sort((a, b) => a.createdAt - b.createdAt);

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start z-50 p-4 print:hidden" onClick={onClose}>
                <div 
                    className="bg-slate-50 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <header className="p-4 border-b bg-white rounded-t-lg flex justify-between items-center sticky top-0">
                        <h2 className="text-xl font-bold text-slate-800">個人レポート: {student.name}</h2>
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">閉じる</button>
                            <button onClick={handlePrint} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                                <PrinterIcon className="w-4 h-4" />
                                印刷
                            </button>
                        </div>
                    </header>
                    <main className="flex-grow overflow-y-auto">
                        <div id="printable-report" className="p-8 bg-white">
                            <h1 className="text-2xl font-bold mb-2 text-slate-900">個人レポート</h1>
                            <div className="flex justify-between items-baseline mb-8 pb-4 border-b">
                                <p className="text-lg font-semibold text-slate-800">{student.className}組 {student.studentNumber}番 {student.name}</p>
                                <p className="text-sm text-slate-500">印刷日: {new Date().toLocaleDateString('ja-JP')}</p>
                            </div>

                            <section className="mb-8">
                                <h3 className="text-xl font-semibold mb-4 text-slate-700">提出状況</h3>
                                {sortedSubmissionLists.length > 0 ? (
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="p-3 font-medium text-slate-600 border">リスト名</th>
                                                <th className="p-3 font-medium text-slate-600 border w-1/4">ステータス</th>
                                                <th className="p-3 font-medium text-slate-600 border w-1/3">提出日時</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedSubmissionLists.map(list => {
                                                const submission = list.submissions.find(s => s.studentId === student.id);
                                                return (
                                                    <tr key={list.id} className="border-b">
                                                        <td className="p-3 border">{list.name}</td>
                                                        <td className={`p-3 border font-medium ${submission ? 'text-green-600' : 'text-red-600'}`}>
                                                            {submission ? '提出済み' : '未提出'}
                                                        </td>
                                                        <td className="p-3 border text-slate-600">
                                                            {submission ? new Date(submission.timestamp).toLocaleString('ja-JP') : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-slate-500">提出記録はありません。</p>
                                )}
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-4 text-slate-700">採点記録</h3>
                                 {sortedGradingLists.length > 0 ? (
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-slate-100">
                                            <tr>
                                                <th className="p-3 font-medium text-slate-600 border">リスト名</th>
                                                <th className="p-3 font-medium text-slate-600 border w-1/4">点数/評価</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedGradingLists.map(list => (
                                                <tr key={list.id} className="border-b">
                                                    <td className="p-3 border">{list.name}</td>
                                                    <td className="p-3 border font-semibold text-slate-800">{list.scores[student.id] || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-slate-500">採点記録はありません。</p>
                                )}
                            </section>
                        </div>
                    </main>
                </div>
            </div>
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-report, #printable-report * {
                            visibility: visible;
                        }
                        #printable-report {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                         @page {
                            size: A4;
                            margin: 20mm;
                        }
                    }
                `}
            </style>
        </>
    );
};

export default StudentReportModal;