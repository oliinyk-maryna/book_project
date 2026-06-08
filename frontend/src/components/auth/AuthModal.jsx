import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, User, Lock, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { API_URL } from '../../config';

// Modes: 'login' | 'register' | 'forgot' | 'code' | 'newpass'
export default function AuthModal({ isOpen, onClose, setIsLoggedIn, initialMode = true }) {
  const [mode, setMode]               = useState(initialMode ? 'login' : 'register');
  const [username, setUsername]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [code, setCode]               = useState(['', '', '', '', '', '']);
  const [resetCode, setResetCode]     = useState(''); // зберігаємо підтверджений код
  const [message, setMessage]         = useState('');
  const [isError, setIsError]         = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const codeRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode ? 'login' : 'register');
      resetState();
    }
  }, [isOpen, initialMode]);

  const resetState = () => {
    setMessage(''); setIsError(false);
    setUsername(''); setEmail(''); setPassword('');
    setNewPassword(''); setConfirmPassword('');
    setCode(['', '', '', '', '', '']);
    setResetCode(''); setShowPassword(false); setShowNewPassword(false);
  };

  const goTo = (m) => { setMode(m); setMessage(''); setIsError(false); };

  if (!isOpen) return null;

  // ── Вхід / Реєстрація ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setIsError(false); setIsLoading(true);
    const isLogin = mode === 'login';
    try {
      const res = await fetch(`${API_URL}${isLogin ? '/login' : '/register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? { email, password } : { username, email, password }),
      });
      if (res.ok || res.status === 201) {
        if (isLogin) {
          const data = await res.json();
          localStorage.setItem('token', data.token);
          setIsLoggedIn(true);
          onClose();
        } else {
          setMessage('Акаунт створено! Тепер ви можете увійти.');
          goTo('login');
          setPassword('');
        }
      } else {
        setIsError(true);
        setMessage((await res.text()) || 'Помилка авторизації');
      }
    } catch {
      setIsError(true); setMessage("Немає зв'язку з сервером");
    } finally { setIsLoading(false); }
  };

  // ── Крок 1: відправка email ─────────────────────────────────────
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setIsError(true); setMessage('Введіть email'); return; }
    setIsLoading(true); setMessage('');
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setIsError(false);
        setMessage('Код надіслано на пошту');
        goTo('code');
      } else {
        setIsError(true); setMessage('Помилка. Перевірте email.');
      }
    } catch {
      setIsError(true); setMessage("Немає зв'язку з сервером");
    } finally { setIsLoading(false); }
  };

  // ── Крок 2: введення коду ──────────────────────────────────────
  const handleCodeInput = (i, val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 1);
    const next = [...code];
    next[i] = cleaned;
    setCode(next);
    if (cleaned && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const handleCodeKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      codeRefs.current[5]?.focus();
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) { setIsError(true); setMessage('Введіть усі 6 цифр'); return; }
    setIsLoading(true); setMessage('');
    try {
      const res = await fetch(`${API_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      });
      if (res.ok) {
        setResetCode(fullCode);
        setIsError(false);
        goTo('newpass');
      } else {
        const txt = await res.text();
        setIsError(true); setMessage(txt || 'Невірний або прострочений код');
      }
    } catch {
      setIsError(true); setMessage("Немає зв'язку з сервером");
    } finally { setIsLoading(false); }
  };

  // ── Крок 3: новий пароль ───────────────────────────────────────
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { setIsError(true); setMessage('Пароль мінімум 8 символів'); return; }
    if (newPassword !== confirmPassword) { setIsError(true); setMessage('Паролі не збігаються'); return; }
    setIsLoading(true); setMessage('');
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetCode, password: newPassword }),
      });
      if (res.ok) {
        setIsError(false);
        setMessage('Пароль успішно змінено!');
        setTimeout(() => { goTo('login'); resetState(); }, 1500);
      } else {
        setIsError(true); setMessage('Помилка. Спробуйте знову.');
      }
    } catch {
      setIsError(true); setMessage("Немає зв'язку з сервером");
    } finally { setIsLoading(false); }
  };

  // ── Заголовки ──────────────────────────────────────────────────
  const titles = {
    login:    { h: 'З поверненням', sub: 'Увійдіть, щоб продовжити читання.' },
    register: { h: 'Створити акаунт', sub: 'Зберігайте книги та приєднуйтесь до спільнот.' },
    forgot:   { h: 'Відновлення пароля', sub: 'Введіть email, пов\'язаний з вашим акаунтом.' },
    code:     { h: 'Введіть код', sub: `Ми надіслали 6-значний код на ${email}` },
    newpass:  { h: 'Новий пароль', sub: 'Придумайте надійний пароль для акаунту.' },
  };
  const { h, sub } = titles[mode] || titles.login;

  const inputCls = "w-full bg-white border border-stone-200 rounded-2xl py-3.5 pl-12 pr-4 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#2C5234] focus:border-[#2C5234] transition-all shadow-sm";

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FDFBF7] w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl relative animate-in slide-in-from-bottom-8 md:zoom-in-95 duration-300 max-h-[90vh] flex flex-col">

        <div className="sticky top-0 z-10 flex justify-end p-4 bg-gradient-to-b from-[#FDFBF7] to-transparent">
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-8 md:px-8 overflow-y-auto scrollbar-thin">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-2 leading-tight">{h}</h2>
            <p className="text-stone-500 text-sm">{sub}</p>
          </div>

          {/* Повідомлення */}
          {message && (
            <div className={`flex items-start gap-3 p-4 mb-6 rounded-2xl text-sm font-medium border ${isError ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
              {isError ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <p>{message}</p>
            </div>
          )}

          {/* ── Логін / Реєстрація ── */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-[#2C5234] transition-colors" />
                    <input type="text" required placeholder="Ім'я користувача" value={username} onChange={e => setUsername(e.target.value)} className={inputCls} />
                  </div>
                )}
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-[#2C5234] transition-colors" />
                  <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-[#2C5234] transition-colors" />
                  <input type={showPassword ? 'text' : 'password'} required placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-2xl py-3.5 pl-12 pr-12 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#2C5234] focus:border-[#2C5234] transition-all shadow-sm" />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => goTo('forgot')} className="text-sm text-[#2C5234] hover:underline font-medium">Забули пароль?</button>
                  </div>
                )}
                <button type="submit" disabled={isLoading}
                  className="w-full bg-[#2C5234] text-white font-bold py-4 rounded-2xl hover:bg-[#1f3a25] transition-colors mt-2 disabled:bg-stone-300 disabled:cursor-not-allowed shadow-md active:scale-95">
                  {isLoading ? 'Зачекайте...' : (mode === 'login' ? 'Увійти' : 'Створити акаунт')}
                </button>
              </form>
              <p className="text-center text-stone-500 text-sm mt-8 pb-4">
                {mode === 'login' ? 'Немає акаунту?' : 'Вже маєте акаунт?'}
                <button type="button" onClick={() => goTo(mode === 'login' ? 'register' : 'login')} className="text-[#2C5234] font-bold hover:underline ml-1.5">
                  {mode === 'login' ? 'Зареєструватись' : 'Увійти'}
                </button>
              </p>
            </>
          )}

          {/* ── Крок 1: Email ── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-[#2C5234] transition-colors" />
                <input type="email" required placeholder="Ваш Email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full bg-[#2C5234] text-white font-bold py-4 rounded-2xl hover:bg-[#1f3a25] transition-colors disabled:bg-stone-300 shadow-md active:scale-95">
                {isLoading ? 'Відправка...' : 'Надіслати код'}
              </button>
              <button type="button" onClick={() => goTo('login')} className="w-full text-sm text-stone-500 hover:text-stone-800 font-medium mt-2 transition-colors py-2">
                ← Повернутися до входу
              </button>
            </form>
          )}

          {/* ── Крок 2: Код ── */}
          {mode === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="flex justify-center gap-2 sm:gap-3">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => codeRefs.current[i] = el}
                    type="text" inputMode="numeric" maxLength={1}
                    value={digit}
                    onChange={e => handleCodeInput(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    onPaste={i === 0 ? handleCodePaste : undefined}
                    className="w-11 h-14 sm:w-13 sm:h-16 text-center text-2xl font-bold bg-white border-2 rounded-2xl text-stone-900 focus:outline-none focus:border-[#2C5234] focus:ring-2 focus:ring-[#2C5234]/20 transition-all shadow-sm caret-transparent"
                    style={{ borderColor: digit ? '#2C5234' : undefined }}
                  />
                ))}
              </div>
              <button type="submit" disabled={isLoading || code.join('').length < 6}
                className="w-full bg-[#2C5234] text-white font-bold py-4 rounded-2xl hover:bg-[#1f3a25] transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed shadow-md active:scale-95">
                {isLoading ? 'Перевірка...' : 'Підтвердити код'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => goTo('forgot')} className="text-stone-500 hover:text-stone-800 transition-colors">
                  ← Змінити email
                </button>
                <button type="button" disabled={isLoading} onClick={handleForgotSubmit}
                  className="text-[#2C5234] hover:underline font-medium disabled:opacity-50 transition-colors">
                  Надіслати знову
                </button>
              </div>
            </form>
          )}

          {/* ── Крок 3: Новий пароль ── */}
          {mode === 'newpass' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-[#2C5234] transition-colors" />
                <input type={showNewPassword ? 'text' : 'password'} required placeholder="Новий пароль" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-2xl py-3.5 pl-12 pr-12 text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#2C5234] focus:border-[#2C5234] transition-all shadow-sm" />
                <button type="button" onClick={() => setShowNewPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-[#2C5234] transition-colors" />
                <input type="password" required placeholder="Підтвердіть пароль" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} />
              </div>
              {newPassword && confirmPassword && (
                <p className={`text-xs font-medium px-1 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                  {newPassword === confirmPassword ? '✓ Паролі збігаються' : '✗ Паролі не збігаються'}
                </p>
              )}
              <button type="submit" disabled={isLoading}
                className="w-full bg-[#2C5234] text-white font-bold py-4 rounded-2xl hover:bg-[#1f3a25] transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed shadow-md active:scale-95">
                {isLoading ? 'Збереження...' : 'Зберегти новий пароль'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}