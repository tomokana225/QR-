import React, { useMemo } from 'react';
import { Student, SubmissionList, GradingList } from '../types';
import { UsersIcon, CheckCircleIcon, DocumentTextIcon, SparklesIcon } from './Icons';

const StatCard: React.FC<{ title: string; value: string | number; detail?: string; icon: React.ReactNode; color: string; textColor: string }> = ({ title, value, detail, icon, color, textColor }) => (
    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center gap-6 transition-transform hover:scale-[1.02] duration-300">
        <div className={`p-4 rounded-2xl ${color} ${textColor} shadow-inner`}>
            {icon}
        </div>
        <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{title}</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
            {detail && <p className="text-xs text-slate-500 mt-1 font-medium">{detail}</p>}
        </div>
    </div>
);

const Dashboard: React.FC<{
    students: Student[];
    submissionLists: SubmissionList[];
    gradingLists: GradingList[];
    onGenerateReport: (studentId: string) => void;
    onLoadMockData: () => void;
}> = ({ students, submissionLists, gradingLists, onGenerateReport, onLoadMockData }) => {
    const stats = useMemo(() => {
        const total = students.length;
        const classes = new Set(students.map(s => s.className)).size;
        const latest = [...submissionLists].sort((a,b) => b.createdAt - a.createdAt)[0];
        const rate = (latest && total > 0) ? (latest.submissions.length / total) * 100 : 0;
        return { total, classes, latest, rate };
    }, [students, submissionLists]);

    if (students.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                <div className="bg-indigo-50 p-10 rounded-full mb-8 shadow-inner">
                    <UsersIcon className="w-16 h-16 text-indigo-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3">生徒データがありません</h3>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    生徒を登録すると、QRコードの生成や提出管理が利用可能になります。
                    まずはデモデータを読み込んで機能を体験してみませんか？
                </p>
                <button 
                    onClick={onLoadMockData}
                    className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all hover:-translate-y-1 active:scale-95"
                >
                    <SparklesIcon className="w-5 h-5" />
                    デモデータを読み込む
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatCard title="Total Students" value={stats.total} detail="登録済み生徒数" icon={<UsersIcon className="w-7 h-7" />} color="bg-indigo-50" textColor="text-indigo-600" />
                <StatCard title="Active Classes" value={stats.classes} detail="展開中のクラス数" icon={<UsersIcon className="w-7 h-7" />} color="bg-emerald-50" textColor="text-emerald-600" />
                <StatCard title="Latest Rate" value={`${stats.rate.toFixed(0)}%`} detail={stats.latest?.name || "提出記録なし"} icon={<CheckCircleIcon className="w-7 h-7" />} color="bg-amber-50" textColor="text-amber-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/30"></div>
                        最近の提出状況
                    </h3>
                    <div className="space-y-8">
                        {submissionLists.slice(0, 5).map(list => {
                            const rate = (list.submissions.length / students.length) * 100;
                            return (
                                <div key={list.id} className="group">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-black text-slate-700 group-hover:text-indigo-600 transition-colors">{list.name}</span>
                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{rate.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${rate}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                        {submissionLists.length === 0 && <p className="text-slate-400 text-sm italic font-medium">記録がありません</p>}
                    </div>
                </div>

                <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
                    <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30"></div>
                        個人レポート生成
                    </h3>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
                        特定の生徒を選択して、これまでの全提出履歴と採点結果をまとめた「個人評価レポート」を生成・印刷します。
                    </p>
                    <div className="relative group">
                        <select 
                            onChange={(e) => e.target.value && onGenerateReport(e.target.value)}
                            className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="">生徒を選択してレポートを開く...</option>
                            {students.sort((a,b) => a.className.localeCompare(b.className, undefined, {numeric: true})).map(s => (
                                <option key={s.id} value={s.id}>{s.className}組 {s.studentNumber}番 {s.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                             <DocumentTextIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-12 pt-8 flex items-center justify-center opacity-10">
                        <DocumentTextIcon className="w-32 h-32 text-indigo-900" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;