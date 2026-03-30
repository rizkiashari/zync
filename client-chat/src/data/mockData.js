export const mockContacts = [
  {
    id: 'u1',
    name: 'Budi Santoso',
    email: 'budi.santoso@email.com',
    avatar: null,
    bio: 'Software Engineer di Jakarta',
    status: 'online',
    lastSeen: new Date(),
    lastMessage: 'Oke siap, nanti saya kabarin ya!',
    lastMessageTime: new Date(Date.now() - 2 * 60 * 1000),
    unread: 3,
  },
  {
    id: 'u2',
    name: 'Siti Rahayu',
    email: 'siti.rahayu@email.com',
    avatar: null,
    bio: 'UI/UX Designer | Bandung',
    status: 'online',
    lastSeen: new Date(),
    lastMessage: 'Desainnya sudah saya kirim ke email kamu 😊',
    lastMessageTime: new Date(Date.now() - 15 * 60 * 1000),
    unread: 0,
  },
  {
    id: 'u3',
    name: 'Ahmad Fauzi',
    email: 'ahmad.fauzi@email.com',
    avatar: null,
    bio: 'Backend Developer | Surabaya',
    status: 'offline',
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
    lastMessage: 'API-nya sudah ready, bisa dicoba sekarang',
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    unread: 1,
  },
  {
    id: 'u4',
    name: 'Dewi Anggraini',
    email: 'dewi.anggraini@email.com',
    avatar: null,
    bio: 'Product Manager | Startup Tech',
    status: 'online',
    lastSeen: new Date(),
    lastMessage: 'Meeting jam 3 sore ya, jangan lupa!',
    lastMessageTime: new Date(Date.now() - 30 * 60 * 1000),
    unread: 2,
  },
  {
    id: 'u5',
    name: 'Rizki Pratama',
    email: 'rizki.pratama@email.com',
    avatar: null,
    bio: 'Full Stack Developer',
    status: 'offline',
    lastSeen: new Date(Date.now() - 5 * 60 * 60 * 1000),
    lastMessage: 'Mantap bro, project-nya berhasil launch!',
    lastMessageTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
    unread: 0,
  },
  {
    id: 'u6',
    name: 'Nur Hidayati',
    email: 'nur.hidayati@email.com',
    avatar: null,
    bio: 'Data Analyst | Yogyakarta',
    status: 'online',
    lastSeen: new Date(),
    lastMessage: 'Laporan Q4 sudah saya upload ke drive',
    lastMessageTime: new Date(Date.now() - 45 * 60 * 1000),
    unread: 0,
  },
  {
    id: 'u7',
    name: 'Hendra Wijaya',
    email: 'hendra.wijaya@email.com',
    avatar: null,
    bio: 'DevOps Engineer',
    status: 'offline',
    lastSeen: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    lastMessage: 'Server sudah di-deploy ke production',
    lastMessageTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    unread: 0,
  },
  {
    id: 'u8',
    name: 'Rina Marlina',
    email: 'rina.marlina@email.com',
    avatar: null,
    bio: 'Mobile Developer | React Native',
    status: 'online',
    lastSeen: new Date(),
    lastMessage: 'Bug-nya sudah fixed, silakan test lagi',
    lastMessageTime: new Date(Date.now() - 10 * 60 * 1000),
    unread: 4,
  },
  {
    id: 'u9',
    name: 'Fajar Nugroho',
    email: 'fajar.nugroho@email.com',
    avatar: null,
    bio: 'Cybersecurity Specialist',
    status: 'offline',
    lastSeen: new Date(Date.now() - 3 * 60 * 60 * 1000),
    lastMessage: 'Vulnerability report sudah dikirim',
    lastMessageTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
    unread: 0,
  },
  {
    id: 'u10',
    name: 'Lestari Putri',
    email: 'lestari.putri@email.com',
    avatar: null,
    bio: 'QA Engineer | Testing Enthusiast',
    status: 'online',
    lastSeen: new Date(),
    lastMessage: 'Test case semua passed! 🎉',
    lastMessageTime: new Date(Date.now() - 5 * 60 * 1000),
    unread: 1,
  },
];

export const mockGroups = [
  {
    id: 'g1',
    name: 'Tim Pengembang Frontend',
    description: 'Diskusi terkait pengembangan frontend dan UI/UX',
    avatar: null,
    members: [
      { id: 'u1', name: 'Budi Santoso', role: 'admin' },
      { id: 'u2', name: 'Siti Rahayu', role: 'member' },
      { id: 'u5', name: 'Rizki Pratama', role: 'member' },
      { id: 'u8', name: 'Rina Marlina', role: 'member' },
    ],
    lastMessage: 'Siap, PR-nya akan saya review besok',
    lastMessageTime: new Date(Date.now() - 20 * 60 * 1000),
    unread: 5,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'g2',
    name: 'Project Aplikasi Mobile',
    description: 'Koordinasi project aplikasi mobile Q1 2026',
    avatar: null,
    members: [
      { id: 'u4', name: 'Dewi Anggraini', role: 'admin' },
      { id: 'u3', name: 'Ahmad Fauzi', role: 'member' },
      { id: 'u8', name: 'Rina Marlina', role: 'member' },
      { id: 'u7', name: 'Hendra Wijaya', role: 'member' },
      { id: 'u10', name: 'Lestari Putri', role: 'member' },
    ],
    lastMessage: 'Sprint planning besok jam 9 pagi ya!',
    lastMessageTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
    unread: 2,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'g3',
    name: 'DevOps & Infrastructure',
    description: 'Monitoring dan pengelolaan infrastruktur server',
    avatar: null,
    members: [
      { id: 'u7', name: 'Hendra Wijaya', role: 'admin' },
      { id: 'u3', name: 'Ahmad Fauzi', role: 'member' },
      { id: 'u9', name: 'Fajar Nugroho', role: 'member' },
    ],
    lastMessage: 'Uptime server minggu ini 99.9%',
    lastMessageTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
    unread: 0,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'g4',
    name: 'Tim QA & Testing',
    description: 'Quality assurance dan pengujian produk',
    avatar: null,
    members: [
      { id: 'u10', name: 'Lestari Putri', role: 'admin' },
      { id: 'u6', name: 'Nur Hidayati', role: 'member' },
      { id: 'u2', name: 'Siti Rahayu', role: 'member' },
    ],
    lastMessage: 'Regression test sudah selesai, hasilnya OK',
    lastMessageTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    unread: 0,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  },
];

const generateMessages = (contactId, contactName) => {
  const now = Date.now();
  return [
    {
      id: `${contactId}_m1`,
      senderId: contactId,
      senderName: contactName,
      text: 'Halo! Gimana kabarnya?',
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m2`,
      senderId: 'me',
      senderName: 'Saya',
      text: 'Baik banget! Kamu gimana?',
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000 - 25 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m3`,
      senderId: contactId,
      senderName: contactName,
      text: 'Alhamdulillah baik. Eh, ada update soal project kita?',
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000 - 20 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m4`,
      senderId: 'me',
      senderName: 'Saya',
      text: 'Ada nih! Jadi kemarin saya sudah selesaikan fitur login dan registrasi. Tinggal integrasi dengan backend.',
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m5`,
      senderId: contactId,
      senderName: contactName,
      text: 'Wah cepet banget! Kira-kira kapan bisa demo ke client?',
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000 - 10 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m6`,
      senderId: 'me',
      senderName: 'Saya',
      text: 'Kalau lancar sih minggu depan bisa. Masih ada beberapa bug kecil yang perlu di-fix.',
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m7`,
      senderId: contactId,
      senderName: contactName,
      text: 'Oke sip! Semangat ya, pasti bisa!',
      timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m8`,
      senderId: 'me',
      senderName: 'Saya',
      text: 'Makasih supportnya 😄',
      timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m9`,
      senderId: contactId,
      senderName: contactName,
      text: 'Btw, kemarin meeting-nya gimana? Bisa hadir semua?',
      timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m10`,
      senderId: 'me',
      senderName: 'Saya',
      text: 'Hampir semua hadir. Cuma dua orang yang tidak bisa karena ada urusan mendadak.',
      timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m11`,
      senderId: contactId,
      senderName: contactName,
      text: 'Oh gitu, ya sudah tidak apa-apa. Yang penting majority hadir.',
      timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000 - 55 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m12`,
      senderId: 'me',
      senderName: 'Saya',
      text: 'Betul. Hasilnya cukup produktif kok. Banyak keputusan penting yang diambil.',
      timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000 - 50 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m13`,
      senderId: contactId,
      senderName: contactName,
      text: 'Syukurlah. Share notesnya dong kalau ada.',
      timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000 - 45 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m14`,
      senderId: 'me',
      senderName: 'Saya',
      text: 'Siap, nanti saya kirim via email ya.',
      timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000 - 40 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m15`,
      senderId: contactId,
      senderName: contactName,
      text: 'Oke makasih!',
      timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000 - 35 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m16`,
      senderId: 'me',
      senderName: 'Saya',
      text: 'Ngomong-ngomong, kamu sudah coba fitur baru yang saya push kemarin?',
      timestamp: new Date(now - 3 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m17`,
      senderId: contactId,
      senderName: contactName,
      text: 'Belum sempat, nanti sore mau saya coba. Ada yang perlu diperhatiin?',
      timestamp: new Date(now - 2 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m18`,
      senderId: 'me',
      senderName: 'Saya',
      text: 'Coba di bagian notifikasi, ada perubahan sedikit di tampilannya. Feedback kamu sangat dibutuhkan!',
      timestamp: new Date(now - 1 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: `${contactId}_m19`,
      senderId: contactId,
      senderName: contactName,
      text: 'Oke siap, nanti saya kabarin ya!',
      timestamp: new Date(now - 2 * 60 * 1000),
      read: false,
    },
  ];
};

const generateGroupMessages = (groupId) => {
  const now = Date.now();
  const memberNames = {
    u1: 'Budi Santoso',
    u2: 'Siti Rahayu',
    u5: 'Rizki Pratama',
    u8: 'Rina Marlina',
    u4: 'Dewi Anggraini',
    u3: 'Ahmad Fauzi',
    u7: 'Hendra Wijaya',
    u10: 'Lestari Putri',
    u9: 'Fajar Nugroho',
    u6: 'Nur Hidayati',
  };

  const msgs = [
    { sender: 'u1', text: 'Selamat pagi semua! Ada yang mau dibahas hari ini?' },
    { sender: 'u2', text: 'Pagi! Aku mau update soal desain halaman dashboard.' },
    { sender: 'me', text: 'Wah, boleh dong share draftnya.' },
    { sender: 'u5', text: 'Setuju, penasaran sama tampilannya.' },
    { sender: 'u2', text: 'Sudah saya upload ke Figma, cek link di channel desain ya!' },
    { sender: 'u1', text: 'Oke mantap! Ngomong-ngomong, ada yang sudah review PR #42?' },
    { sender: 'me', text: 'Sudah, tinggal tunggu approval dari Budi.' },
    { sender: 'u8', text: 'Saya juga sudah review, ada satu komentar kecil soal naming convention.' },
    { sender: 'u1', text: 'Oke nanti saya cek. Thanks ya semua!' },
    { sender: 'u5', text: 'Btw, testing env sudah up belum? Mau coba deploy.' },
    { sender: 'me', text: 'Sudah! Bisa langsung deploy ke staging.' },
    { sender: 'u5', text: 'Siip, makasih info-nya.' },
    { sender: 'u2', text: 'Oh iya, jangan lupa besok ada standup jam 9.' },
    { sender: 'u8', text: 'Noted! Akan saya set alarm 😄' },
    { sender: 'u1', text: 'Haha, jangan sampai telat ya.' },
    { sender: 'me', text: 'Insya Allah on time!' },
    { sender: 'u5', text: 'Gue pasti hadir, sudah masuk kalender kok.' },
    { sender: 'u8', text: 'Nanti ada demo fitur baru gak?' },
    { sender: 'u1', text: 'Ada! Rizki mau demo fitur real-time notification.' },
    { sender: 'u5', text: 'Siap, PR-nya akan saya review besok' },
  ];

  return msgs.map((m, i) => ({
    id: `${groupId}_m${i + 1}`,
    senderId: m.sender,
    senderName: m.sender === 'me' ? 'Saya' : (memberNames[m.sender] || 'Anggota'),
    text: m.text,
    timestamp: new Date(now - (msgs.length - i) * 15 * 60 * 1000),
    read: true,
  }));
};

export const mockMessages = {
  u1: generateMessages('u1', 'Budi Santoso'),
  u2: generateMessages('u2', 'Siti Rahayu'),
  u3: generateMessages('u3', 'Ahmad Fauzi'),
  u4: generateMessages('u4', 'Dewi Anggraini'),
  u5: generateMessages('u5', 'Rizki Pratama'),
  u6: generateMessages('u6', 'Nur Hidayati'),
  u7: generateMessages('u7', 'Hendra Wijaya'),
  u8: generateMessages('u8', 'Rina Marlina'),
  u9: generateMessages('u9', 'Fajar Nugroho'),
  u10: generateMessages('u10', 'Lestari Putri'),
  g1: generateGroupMessages('g1'),
  g2: generateGroupMessages('g2'),
  g3: generateGroupMessages('g3'),
  g4: generateGroupMessages('g4'),
};

export const formatTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  if (diffHour < 24) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDay === 1) return 'Kemarin';
  if (diffDay < 7) return d.toLocaleDateString('id-ID', { weekday: 'long' });
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
};

export const formatMessageTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateDivider = (date) => {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diffDay = Math.floor((now - d) / 86400000);
  if (diffDay === 0) return 'Hari ini';
  if (diffDay === 1) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};
