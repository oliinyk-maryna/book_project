import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPassword } from '../api/auth.api';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (!token) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 font-bold text-red-500 text-xl">
                Недійсне або відсутнє посилання
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) return toast.error("Пароль має містити мінімум 6 символів");
        
        setLoading(true);
        try {
            await resetPassword(token, password);
            toast.success("Пароль успішно змінено!");
            navigate('/'); 
        } catch (err) {
            toast.error("Токен недійсний або прострочений");
        } finally {
            setLoading(false);
        }
    };

    return (
        /* h-screen фіксує висоту, а inset-0 + fixed гарантує, що жодні сусідні елементи (напр. Header) не зсунуть цей блок */
        <div className="fixed inset-0 h-screen w-screen flex items-center justify-center bg-slate-50 px-4 overflow-hidden">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 dynamic-shadow">
                <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Новий пароль</h2>
                <p className="text-sm text-slate-500 mb-6">Будь ласка, введіть новий надійний пароль.</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input 
                        type="password" 
                        placeholder="Новий пароль" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow hover:bg-indigo-700 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Збереження...' : 'Зберегти пароль'}
                    </button>
                </form>
            </div>
        </div>
    );
}