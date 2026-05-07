"use client";
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export default function KaeliaArchive() {
  const [videos, setVideos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVid, setSelectedVid] = useState<any>(null);

  // Formulario
  const [upUrl, setUpUrl] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upTags, setUpTags] = useState("");

  // Login
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  useEffect(() => {
    // Cargar Usuario Local
    const localUser = localStorage.getItem('kaelia_user');
    const localAdmin = localStorage.getItem('kaelia_admin');
    if (localUser) setCurrentUser(JSON.parse(localUser));
    if (localAdmin === 'true') setIsAdmin(true);

    // Cargar Videos en tiempo real
    const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!loginUser || !loginPass) return alert("Rellena los datos");
    const userRef = doc(db, "users", loginUser.toLowerCase().trim());
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      if (userSnap.data().pass === loginPass) {
        const data = userSnap.data();
        setCurrentUser(data);
        localStorage.setItem('kaelia_user', JSON.stringify(data));
      } else {
        alert("PIN incorrecto");
      }
    } else {
      const newUser = { user: loginUser.toLowerCase(), pass: loginPass, pfp: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' };
      await setDoc(userRef, newUser);
      setCurrentUser(newUser);
      localStorage.setItem('kaelia_user', JSON.stringify(newUser));
    }
  };

  const saveVideo = async () => {
    if (!upUrl || !currentUser) return;
    const tagsArray = upTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== "");
    await addDoc(collection(db, "videos"), {
      title: upTitle || "Sin título",
      url: upUrl,
      tags: tagsArray,
      uploader: currentUser.user,
      pfp: currentUser.pfp,
      timestamp: serverTimestamp()
    });
    setUpUrl(""); setUpTitle(""); setUpTags("");
    setSidebarOpen(false);
  };

  const deleteVid = async (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("¿Borrar definitivamente?")) await deleteDoc(doc(db, "videos", id));
  };

  const askAdminKey = () => {
    const key = prompt("Introduce la llave maestra:");
    if (key === "1234") {
      setIsAdmin(true);
      localStorage.setItem('kaelia_admin', 'true');
      alert("Poder de administrador activado. ✨");
    }
  };

  const filteredVideos = videos.filter(v => 
    v.title?.toLowerCase().includes(search.toLowerCase()) || 
    v.tags?.some((t:any) => t.includes(search.toLowerCase())) ||
    v.uploader?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      
      {/* OVERLAY & SIDEBAR */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-[999]" onClick={() => setSidebarOpen(false)} />
      )}
      
      <div className={`fixed top-0 left-0 w-[300px] h-full bg-[#0f0f0f] z-[1000] transition-all duration-300 border-r border-[#1a1a1a] p-6 overflow-y-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {currentUser ? (
          <div className="text-center mb-6 p-5 bg-black rounded-2xl border border-[#1a1a1a]">
            <img src={currentUser.pfp} className="w-20 h-20 rounded-full mx-auto border-2 border-pink-500 object-cover" />
            <p className="mt-3 font-bold">{currentUser.user}</p>
            {isAdmin && <p className="text-[10px] text-pink-500 tracking-[2px] mt-1">MODO ADMINISTRADOR</p>}
            <button className="w-full mt-4 bg-[#1a1a1a] p-2 rounded-lg text-xs hover:border-pink-500 border border-transparent" onClick={() => {localStorage.clear(); location.reload();}}>Cerrar Sesión</button>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-[10px] text-zinc-500 mb-3 uppercase">Cuenta Comunitaria</p>
            <input type="text" placeholder="Usuario" className="w-full bg-black border border-[#1a1a1a] p-3 rounded-lg mb-2 outline-none" onChange={e => setLoginUser(e.target.value)} />
            <input type="password" placeholder="PIN" className="w-full bg-black border border-[#1a1a1a] p-3 rounded-lg mb-4 outline-none" onChange={e => setLoginPass(e.target.value)} />
            <button className="w-full bg-pink-600 p-3 rounded-lg font-bold" onClick={handleLogin}>Entrar / Crear</button>
          </div>
        )}

        <button className="w-full text-left bg-[#1a1a1a] p-3 rounded-lg mb-2 text-sm" onClick={askAdminKey}>🔑 Admin Key</button>
        <button className="w-full text-left bg-[#1a1a1a] p-3 rounded-lg mb-2 text-sm" onClick={() => setSearch(currentUser?.user || "")}>📁 Mis Videos</button>
        <button className="w-full text-left bg-[#1a1a1a] p-3 rounded-lg mb-8 text-sm" onClick={() => setSearch("")}>🌐 Ver Todo</button>

        {currentUser && (
          <div className="border-t border-[#1a1a1a] pt-6">
            <p className="text-[10px] text-pink-500 mb-3 uppercase tracking-widest">Publicar</p>
            <input value={upUrl} onChange={e => setUpUrl(e.target.value)} placeholder="URL (.mp4 o embed)" className="w-full bg-black border border-[#1a1a1a] p-3 rounded-lg mb-2 text-sm" />
            <input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Título" className="w-full bg-black border border-[#1a1a1a] p-3 rounded-lg mb-2 text-sm" />
            <input value={upTags} onChange={e => setUpTags(e.target.value)} placeholder="Tags (ej: pov, 4k)" className="w-full bg-black border border-[#1a1a1a] p-3 rounded-lg mb-4 text-sm" />
            <button className="w-full bg-white text-black p-3 rounded-lg font-bold" onClick={saveVideo}>Subir Video</button>
          </div>
        )}
      </div>

      {/* NAVBAR */}
      <nav className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-[#1a1a1a] p-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="text-2xl cursor-pointer" onClick={() => setSidebarOpen(true)}>☰</div>
          <input 
            type="text" 
            placeholder="Buscar por título o #tag..." 
            className="flex-1 bg-[#0f0f0f] border border-[#1a1a1a] p-2 px-4 rounded-xl outline-none focus:border-pink-500 transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </nav>

      {/* GRID */}
      <main className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVideos.map((vid) => (
            <div key={vid.id} className="relative group cursor-pointer" onClick={() => setSelectedVid(vid)}>
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-[#1a1a1a] relative">
                {vid.url.includes('mp4') ? (
                  <video muted loop className="w-full h-full object-cover">
                    <source src={vid.url} />
                  </video>
                ) : (
                  <iframe src={vid.url} className="w-full h-full pointer-events-none" />
                )}
                {(isAdmin || (currentUser && vid.uploader === currentUser.user)) && (
                  <button className="absolute top-2 right-2 bg-red-600 p-1 px-3 rounded-md text-[10px] font-bold z-10" onClick={(e) => deleteVid(vid.id, e)}>X</button>
                )}
              </div>
              <div className="mt-4 flex gap-3">
                <img src={vid.pfp} className="w-10 h-10 rounded-full object-cover border border-zinc-800" />
                <div>
                  <h3 className="font-bold text-sm line-clamp-2">{vid.title}</h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {vid.tags?.map((t: string) => (
                      <span key={t} className="text-[10px] bg-[#1a1a1a] text-zinc-500 px-2 py-0.5 rounded">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL */}
      {selectedVid && (
        <div className="fixed inset-0 bg-black z-[2000] p-4 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <button className="bg-[#1a1a1a] p-2 px-6 rounded-lg mb-4" onClick={() => setSelectedVid(null)}>✕ Cerrar</button>
            <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl shadow-pink-500/10">
              {selectedVid.url.includes('mp4') ? (
                <video controls autoPlay className="w-full h-full"><source src={selectedVid.url} /></video>
              ) : (
                <iframe src={selectedVid.url} className="w-full h-full" allowFullScreen />
              )}
            </div>
            <h2 className="mt-6 text-2xl font-bold">{selectedVid.title}</h2>
            <p className="text-pink-500 text-sm mt-1">Subido por {selectedVid.uploader}</p>
          </div>
        </div>
      )}
    </div>
  );
}
