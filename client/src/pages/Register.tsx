import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await register(email, password);
      navigate('/');
    } catch {
      setError('Kayıt başarısız. Bu e-posta zaten kullanımda olabilir.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Kayıt Ol</h1>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <input
          type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="password" placeholder="Şifre (min. 6 karakter)" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          minLength={6} required
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
          Kayıt Ol
        </button>
        <p className="text-center text-sm text-gray-500">
          Hesabın var mı? <Link to="/login" className="text-blue-600 hover:underline">Giriş Yap</Link>
        </p>
      </form>
    </div>
  );
}
