"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, 
  doc, getDoc, setDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

export default function KaeliaPremium() {
  const [videos, setVideos] = useState<any[]>([]);
  const [users, setUsers] = useState<any>({}); 
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estados de Interfaz
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserPanelOpen, setUserPanelOpen] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedVid, setSelectedVid] = useState<any>(null);
  
  // Formularios
  const [adminInput, setAdminInput] = useState("");
  const [upUrl, setUpUrl] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upTags, setUpTags] = useState("");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const localUser = localStorage.getItem('kaelia_user');
    if (localUser) setCurrentUser(JSON.parse(localUser));
    if (localStorage.getItem('kaelia_admin') === 'true') setIsAdmin(true);

    onSnapshot(collection(db, "users"), (snap) => {
      const uMap: any = {};
      snap.forEach(d => uMap[d.id] = d.data().pfp);
      setUsers(uMap);
    });

    const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // Lógica de Recomendados
  const getRecommended = (currentVid: any) => {
    if (!currentVid) return [];
    return videos
      .filter(v => v.id !== currentVid.id)
      .map(v => ({
        ...v,
        score: v.tags?.filter((t: string) => currentVid.tags?.includes(t)).length || 0
      }))
      .sort((a, b) => b.score - a.score || Math.random() - 0.5).slice(0, 8);
  };

  const handleLogin = async () => {
    const userKey = loginUser.toLowerCase().trim();
    if (!userKey || !loginPass) return;
    const userRef = doc(db, "users", userKey);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      if (snap.data().pass === loginPass) {
        setCurrentUser(snap.data());
        localStorage.setItem('kaelia_user', JSON.stringify(snap.data()));
      } else alert("PIN Incorrecto");
    } else {
      const newUser = { user: userKey, pass: loginPass, pfp: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' };
      await setDoc(userRef, newUser);
      setCurrentUser(newUser);
      localStorage.setItem('kaelia_user', JSON.stringify(newUser));
    }
  };

  const checkAdminKey = () => {
    if (adminInput === "1234") {
      setIsAdmin(true);
      localStorage.setItem('kaelia_admin', 'true');
      setShowAdminModal(false);
      setAdminInput("");
    } else {
      alert("Llave incorrecta");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 selection:bg-pink-500/30">
      
      {/* --- NAVBAR SUPERIOR --- */}
      <nav className="sticky top-0 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 p-4 z-[100]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-full text-pink-500 text-xl">☰</button>
            <h1 className="hidden md:block font-black italic text-xl tracking-tighter text-white">KAELIA<span className="text-pink-500">.</span></h1>
          </div>

          <div className="flex-1 max-w-2xl relative">
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar contenido..." 
              className="w-full bg-white/5 border border-white/10 p-2.5 px-5 rounded-full outline-none focus:border-pink-500/50 transition-all text-sm"
            />
          </div>

          {/* BOTÓN DE PERFIL (Esquina superior derecha) */}
          <button 
            onClick={() => setUserPanelOpen(true)}
            className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-zinc-900 flex items-center justify-center hover:scale-110 transition-transform"
          >
            {currentUser ? (
              <img src={users[currentUser.user] || currentUser.pfp} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">👤</span>
            )}
          </button>
        </div>
      </nav>

      {/* --- PANEL DE USUARIO (DERECHA) --- */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-[#0a0a0a] border-l border-white/5 z-[200] transition-transform duration-300 p-6 ${isUserPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-sm tracking-widest uppercase text-zinc-500">Cuenta</h3>
          <button onClick={() => setUserPanelOpen(false)} className="text-xl">✕</button>
        </div>

        {currentUser ? (
          <div className="space-y-6">
            <div className="text-center">
              <img src={users[currentUser.user] || currentUser.pfp} className="w-24 h-24 rounded-full mx-auto border-2 border-pink-500 object-cover p-1" />
              <h2 className="mt-4 font-black text-xl italic">@{currentUser.user}</h2>
              {isAdmin && <p className="text-[10px] text-pink-500 font-bold mt-1 tracking-[4px]">ADMINISTRADOR</p>}
            </div>
            <div className="space-y-2">
              <button onClick={() => {const n = prompt("URL Foto:"); if(n) setDoc(doc(db, "users", currentUser.user), {pfp: n}, {merge: true});}} className="w-full bg-white/5 p-3 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors">CAMBIAR AVATAR</button>
              <button onClick={() => {localStorage.clear(); location.reload();}} className="w-full bg-red-500/10 text-red-500 p-3 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors">CERRAR SESIÓN</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">Inicia sesión para subir contenido.</p>
            <input type="text" placeholder="Usuario" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm" onChange={e => setLoginUser(e.target.value)} />
            <input type="password" placeholder="PIN" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm" onChange={e => setLoginPass(e.target.value)} />
            <button onClick={handleLogin} className="w-full bg-pink-600 p-3 rounded-xl font-bold shadow-lg shadow-pink-600/20 transition-transform active:scale-95">ACCEDER</button>
          </div>
        )}
      </div>

      {/* --- SIDEBAR IZQUIERDO (PUBLICAR / MENU) --- */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#0a0a0a] border-r border-white/5 z-[200] transition-transform duration-300 p-6 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-pink-500 tracking-tighter italic text-xl">MENU</h3>
          <button onClick={() => setSidebarOpen(false)} className="text-xl">✕</button>
        </div>

        <div className="space-y-2">
          <button onClick={() => {setSearch(""); setSidebarOpen(false);}} className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-all text-sm">🌐 Explorar Todo</button>
          {currentUser && (
            <button onClick={() => {setSearch(currentUser.user); setSidebarOpen(false);}} className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-all text-sm">📁 Mis Videos</button>
          )}
        </div>

        {currentUser && (
          <div className="mt-10 pt-10 border-t border-white/5 space-y-4">
            <p className="text-[10px] text-pink-500 font-bold tracking-widest uppercase">Publicar</p>
            <input value={upUrl} onChange={e => setUpUrl(e.target.value)} placeholder="URL Video o Embed" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-pink-500/50" />
            <input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Título" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-pink-500/50" />
            <input value={upTags} onChange={e => setUpTags(e.target.value)} placeholder="Tags (pov, chill...)" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs outline-none focus:border-pink-500/50" />
            <button onClick={async () => {
              await addDoc(collection(db, "videos"), {
                title: upTitle || "Sin título", url: upUrl, uploader: currentUser.user,
                tags: upTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== ""),
                timestamp: serverTimestamp()
              });
              setUpUrl(""); setUpTitle(""); setUpTags(""); setSidebarOpen(false);
            }} className="w-full bg-white text-black py-3 rounded-xl font-black text-[10px] tracking-widest hover:bg-pink-500 hover:text-white transition-all">SUBIR ARCHIVO</button>
          </div>
        )}

        <button 
          onClick={() => setShowAdminModal(true)} 
          className="absolute bottom-6 left-6 right-6 p-3 bg-zinc-900 border border-white/5 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-white transition-all"
        >
          {isAdmin ? 'ADMINISTRADOR ACTIVO' : 'MODO ADMIN'}
        </button>
      </div>

      {/* --- MODAL DE ADMIN KEY (Sin ventana de Google) --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 p-8 rounded-[30px] w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-xl font-black mb-2 tracking-tighter uppercase">Admin Key</h2>
            <p className="text-xs text-zinc-500 mb-6">Introduce la llave maestra para activar permisos.</p>
            <input 
              type="password" autoFocus
              className="w-full bg-black border border-white/10 p-4 rounded-2xl text-center text-2xl tracking-[10px] outline-none focus:border-pink-500 transition-all mb-4"
              value={adminInput} onChange={e => setAdminInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkAdminKey()}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAdminModal(false)} className="flex-1 p-3 bg-zinc-800 rounded-xl text-xs font-bold">CANCELAR</button>
              <button onClick={checkAdminKey} className="flex-1 p-3 bg-pink-600 rounded-xl text-xs font-bold">ACTIVAR</button>
            </div>
          </div>
        </div>
      )}

      {/* --- FEED DE VIDEOS --- */}
      <main className="p-4 md:p-8 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {videos.filter(v => v.title?.toLowerCase().includes(search.toLowerCase()) || v.tags?.some((t:any) => t.includes(search.toLowerCase())) || v.uploader?.toLowerCase().includes(search.toLowerCase()))
          .map((vid) => (
            <div key={vid.id} className="group cursor-pointer bg-white/5 rounded-[30px] overflow-hidden border border-white/5 hover:border-pink-500/30 transition-all shadow-xl" onClick={() => setSelectedVid(vid)}>
              <div className="aspect-video bg-black relative">
                {vid.url.includes('mp4') ? (
                  <video muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} className="w-full h-full object-cover">
                    <source src={vid.url} />
                  </video>
                ) : (
                  <iframe src={vid.url} className="w-full h-full pointer-events-none opacity-80" />
                )}
                {isAdmin && (
                   <button onClick={(e) => {e.stopPropagation(); deleteDoc(doc(db, "videos", vid.id));}} className="absolute top-3 right-3 bg-red-600 p-2 rounded-xl text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">BORRAR</button>
                )}
              </div>
              <div className="p-4 flex gap-3">
                <img src={users[vid.uploader] || vid.pfp} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm truncate">{vid.title}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">@{vid.uploader}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- MODAL PLAYER --- */}
      {selectedVid && (
        <div className="fixed inset-0 bg-[#050505] z-[2000] overflow-y-auto p-4 md:p-10 animate-in fade-in zoom-in duration-300">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-3">
              <button onClick={() => setSelectedVid(null)} className="mb-6 bg-white/5 p-3 px-6 rounded-2xl text-[10px] font-bold tracking-widest">← VOLVER</button>
              <div key={selectedVid.id} className="aspect-video w-full bg-black rounded-[40px] overflow-hidden border border-white/10 shadow-2xl">
                {selectedVid.url.includes('mp4') ? (
                  <video onEnded={() => {const n = getRecommended(selectedVid)[0]; if(n) setSelectedVid(n);}} controls autoPlay className="w-full h-full object-contain"><source src={selectedVid.url} /></video>
                ) : (
                  <iframe src={`${selectedVid.url}${selectedVid.url.includes('?') ? '&' : '?'}autoplay=1`} className="w-full h-full" allowFullScreen />
                )}
              </div>
              <h2 className="mt-8 text-3xl font-black italic tracking-tighter uppercase">{selectedVid.title}</h2>
              <div className="flex items-center gap-4 mt-4">
                <img src={users[selectedVid.uploader]} className="w-10 h-10 rounded-full border border-pink-500/20" />
                <span className="text-zinc-500 font-bold text-xs">ARCHIVO SUBIDO POR <span className="text-white">@{selectedVid.uploader.toUpperCase()}</span></span>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-pink-500 font-black text-xs uppercase tracking-widest">Siguiente</h3>
              {getRecommended(selectedVid).map(rec => (
                <div key={rec.id} onClick={() => setSelectedVid(rec)} className="flex gap-4 group cursor-pointer bg-white/5 p-3 rounded-3xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                  <div className="w-24 aspect-video bg-black rounded-xl overflow-hidden flex-shrink-0">
                    {rec.url.includes('mp4') ? <video muted className="w-full h-full object-cover opacity-50"><source src={rec.url}/></video> : <div className="w-full h-full bg-zinc-900"/>}
                  </div>
                  <div className="overflow-hidden justify-center flex flex-col">
                    <h4 className="text-[11px] font-bold truncate group-hover:text-pink-500">{rec.title}</h4>
                    <p className="text-[9px] text-zinc-500 mt-1 uppercase">@{rec.uploader}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
