
import React, { useState } from 'react';
import { signIn } from '../utils/firebase';
import { QrCodeIcon, SparklesIcon, ExclamationTriangleIcon } from './Icons';

interface LoginPageProps {
    onLoginSuccess: () => void;
    onGoToSettings: () => void;
    isFirebaseReady?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onGoToSettings, isFirebaseReady = true }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!isFirebaseReady) {
            setError('Firebase接続設定が見つかりません。システム設定からAPIキーを登録してください。');
            setIsLoading(false);
            return;
        }

        try {
            await signIn(email, password);
            onLoginSuccess();
        } catch (err: any) {
            console.error(err);
            if (err.message && err.message.includes("Firebase not initialized")) {
                setError('システム設定エラー: APIキーが設定されていません。下のリンクから設定してください。');
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('メールアドレスまたはパスワードが間違っています。');
            } else if (err.code === 'auth/too-many-requests') {
                setError('ログイン試行回数が多すぎます。しばらく待ってから再試行してください。');
            } else {
                setError('ログインに失敗しました: ' + (err.message || '不明なエラー'));
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-6">
                    <QrCodeIcon className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    QR Student Manager
                </h2>
                <p className="mt-2 text-sm text-slate-600 font-medium">
                    生徒管理・提出チェック・採点をスマートに
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-10 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-3xl sm:px-12 border border-slate-100">
                    
                    {!isFirebaseReady && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <p className="font-bold">初期設定が必要です</p>
                                <p className="mt-1 text-xs leading-relaxed">
                                    Cloudflare環境変数が読み込まれていないか、APIキーが未設定です。以下の「システム設定」から手動で設定を行ってください。
                                </p>
                            </div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                Email Address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors bg-slate-50"
                                    placeholder="user@example.com"
                                    disabled={!isFirebaseReady}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors bg-slate-50"
                                    placeholder="••••••••"
                                    disabled={!isFirebaseReady}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-50 p-4 border border-red-100 animate-fade-in">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-bold text-red-800">ログインエラー</h3>
                                        <div className="mt-1 text-sm text-red-700">
                                            <p>{error}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading || !isFirebaseReady}
                                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-xl shadow-indigo-500/20 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-5 h-5" />
                                        サインイン
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <button onClick={onGoToSettings} className="text-xs text-slate-400 underline hover:text-indigo-500 transition-colors">
                            システム設定（APIキー登録）
                        </button>
                    </div>
                </div>
                <p className="mt-8 text-center text-xs text-slate-400 font-medium">
                    &copy; 2024 QR Student Manager Pro
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
