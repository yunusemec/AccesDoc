import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
      <h1 className="text-3xl font-bold">Hoşgeldin, {user?.email}</h1>
      <p className="text-gray-500">Plan: {user?.plan} · Token: {user?.tokens}</p>
      <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">
        Çıkış Yap
      </button>
    </div>
  );
}
