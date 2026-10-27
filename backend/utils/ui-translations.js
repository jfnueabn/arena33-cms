const entries = {
  'month': ['bulan', '月'],
  '/ month': ['/ bulan', '/ 月'],
  'Home': ['Utama', '首页'], 'Popular Games': ['Permainan Popular', '热门游戏'], 'Welcome Bonus': ['Bonus Selamat Datang', '迎新优惠'], 'Sports Betting': ['Pertaruhan Sukan', '体育博彩'],
  'Log In': ['Log masuk', '登录'], 'Log in': ['Log masuk', '登录'], 'Sign Up': ['Daftar', '注册'], 'Register now': ['Daftar sekarang', '立即注册'],
  'Contact us': ['Hubungi kami', '联系我们'], 'Skip to content': ['Langkau ke kandungan', '跳至内容'], 'Open menu': ['Buka menu', '打开菜单'],
  'Explore game': ['Terokai permainan', '了解游戏'], 'All games': ['Semua permainan', '所有游戏'], 'games': ['permainan', '款游戏'], 'game': ['permainan', '款游戏'],
  'THE COLLECTION': ['KOLEKSI PERMAINAN', '游戏精选'], 'Discover. Explore. Find your favourite.': ['Temui permainan kegemaran anda.', '探索并发现你的最爱。'],
  'The collection is being updated. Please check back soon.': ['Koleksi sedang dikemas kini. Sila kembali nanti.', '游戏列表正在更新，请稍后查看。'],
  'Filter games by category': ['Tapis permainan mengikut kategori', '按类别筛选游戏'], 'Quick account links': ['Pautan akaun pantas', '快捷账户链接'],
  'Offer period': ['Tempoh tawaran', '优惠期限'], 'Offer ends in': ['Tawaran tamat dalam', '优惠倒计时'], 'Days': ['Hari', '天'], 'Hours': ['Jam', '小时'], 'Minutes': ['Minit', '分钟'], 'Seconds': ['Saat', '秒'],
  'Bonus type': ['Jenis bonus', '优惠类型'], 'Percentage': ['Peratusan', '比例'], 'Maximum credit': ['Kredit maksimum', '最高额度'], 'Minimum deposit': ['Deposit minimum', '最低存款'], 'Play-through': ['Syarat pertaruhan', '流水要求'], 'Valid period': ['Tempoh sah', '有效期'],
  'Bonus offer comparison': ['Perbandingan tawaran bonus', '优惠对比'], 'See terms': ['Lihat syarat', '查看条款'], 'Check the current offer period with our team.': ['Semak tempoh tawaran dengan pasukan kami.', '请向客服确认当前优惠期限。'],
  'New offers will be listed here when available.': ['Tawaran baharu akan disenaraikan apabila tersedia.', '新优惠推出后将在此展示。'], 'Your next step': ['Langkah seterusnya', '下一步'], 'Contact:': ['Hubungi:', '联系：'],
  'Feature': ['Ciri', '功能'], 'Spin Now!': ['Putar sekarang!', '立即转盘'], 'DAYS': ['HARI', '天'], 'HOURS': ['JAM', '小时'], 'MINS': ['MINIT', '分钟'], 'SECS': ['SAAT', '秒']
};
module.exports = (text, locale = 'en') => locale === 'en' ? text : entries[text]?.[locale === 'ms' ? 0 : 1] || text;
module.exports.entries = entries;
