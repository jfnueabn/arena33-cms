// Default homepage content. Used to seed the database and as the
// "shape" the admin editor uses when adding new list items.

const settings = {
  site_name: 'Arena33',
  seo_title: "Arena33 – Malaysia's #1 Fantasy Football & Esports Hub | Join Free",
  seo_description: "Arena33 is Malaysia's free fantasy football and esports community. Build your Liga Super & EPL dream team, join weekly tournaments, and win rewards. Sign up free today.",
  seo_keywords: 'fantasy football Malaysia, Liga Super fantasy, EPL fantasy, esports Malaysia, free tournaments, Arena33',
  // Render sets RENDER_EXTERNAL_URL automatically; SITE_URL overrides it (e.g. a custom domain).
  canonical_url: process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000/',
  og_image: '',
  robots_index: '1',
  language: 'en-MY',
  accent_color: '#facc15',
  secondary_color: '#22d3ee',
  ga_id: ''
};

const sections = [
  {
    section_key: 'header', name: 'Header & navigation', is_fixed: true,
    eyebrow: '', title: '', subtitle: '',
    content: {
      logo_text: 'Arena', logo_accent: '33', logo_image: '',
      nav: [
        { label: 'About', url: '#about' },
        { label: 'Features', url: '#features' },
        { label: 'How It Works', url: '#how' },
        { label: 'Plans', url: '#plans' },
        { label: 'FAQ', url: '#faq' }
      ],
      login_button: { text: 'Log In', url: '#login' },
      signup_button: { text: 'Sign Up', url: '#signup' }
    }
  },
  {
    section_key: 'hero', name: 'Hero',
    eyebrow: '⚡ #1 Fantasy Platform in Malaysia',
    title: "Arena33 – Malaysia's Fantasy Football & Esports Hub",
    subtitle: '',
    content: {
      highlight: "Malaysia's Fantasy Football",
      description: 'Build your dream Liga Super and EPL squad, challenge friends, and climb the national leaderboard. Fast, fair and 100% free to start.',
      primary_button: { text: 'Join Free', url: '#signup' },
      secondary_button: { text: 'Explore Features', url: '#features' },
      image: '',
      image_alt: 'Fantasy football players celebrating',
      tags: ['🔴 LIVE · JDT 2 – 1 Selangor', '🏆 Weekly Cup · 12,480 players']
    }
  },
  {
    section_key: 'stats', name: 'Stats counters',
    eyebrow: '', title: '', subtitle: '',
    content: {
      items: [
        { value: 120000, suffix: '+', label: 'Registered Players' },
        { value: 6, suffix: '', label: 'Leagues Covered' },
        { value: 350, suffix: '', label: 'Tournaments / Month' },
        { value: 8500, suffix: '+', label: 'Online Now' },
        { value: 99, suffix: '%', label: 'Uptime' },
        { value: 24, suffix: '/7', label: 'Support' }
      ]
    }
  },
  {
    section_key: 'promo', name: 'Promo banner',
    eyebrow: 'Latest Promotions', title: 'Exclusive Offers & Rewards',
    subtitle: 'Fresh rewards every week for the Arena33 community.',
    content: {
      banner_title: 'Welcome Pack: 3 Free Premium Weeks',
      banner_text: 'Sign up this month and unlock premium player stats, captain boosts and private leagues — free.',
      button: { text: 'Claim Now', url: '#signup' },
      color_from: '#7c3aed', color_to: '#db2777',
      expires_at: ''
    }
  },
  {
    section_key: 'about', name: 'About',
    eyebrow: 'About Arena33', title: 'A World-Class Fantasy Platform, Built for Malaysia', subtitle: '',
    content: {
      paragraphs: [
        "Arena33 is more than a fantasy game. We built it with one goal: give every Malaysian football and esports fan a smooth, fair and exciting way to prove their knowledge — from Kuala Lumpur to Kota Bharu and Miri.",
        'Live data, local leagues and community features come together in one place, available in English and Bahasa Melayu.'
      ],
      button: { text: 'Join Us Today', url: '#signup' },
      card_title: 'Leagues & titles we cover',
      tags: ['Liga Super Malaysia', 'English Premier League', 'AFC Champions League', 'Piala Malaysia', 'MLBB', 'Valorant', 'Dota 2', 'FIFA World Cup Qualifiers'],
      card_note: 'New competitions are added every season based on community votes.'
    }
  },
  {
    section_key: 'features', name: 'Features',
    eyebrow: 'Our Advantages', title: 'Why Choose Arena33?',
    subtitle: 'Everything a fantasy fan needs, in one fast and friendly platform.',
    content: {
      items: [
        { icon: '⚡', title: 'Real-Time Scoring', description: 'Points update seconds after every goal, assist and clean sheet.' },
        { icon: '🔒', title: 'Secure Accounts', description: '256-bit SSL encryption and two-factor login keep your account safe.' },
        { icon: '📊', title: 'Pro-Level Stats', description: 'xG, form charts and fixture difficulty to help you pick smarter.' },
        { icon: '📱', title: 'Mobile Friendly', description: 'Optimised for iOS and Android browsers — no app download needed.' },
        { icon: '💬', title: '24/7 Support', description: 'Reach our team any time via live chat, WhatsApp or email.' },
        { icon: '⚖️', title: 'Fair Play', description: 'Transparent scoring rules and anti-cheat checks on every league.' },
        { icon: '🎁', title: 'Weekly Rewards', description: 'Top managers win merch, match tickets and e-vouchers every week.' },
        { icon: '🇲🇾', title: 'Local First', description: 'Full Bahasa Melayu support and Malaysian league coverage.' }
      ]
    }
  },
  {
    section_key: 'countdown', name: 'Countdown event',
    eyebrow: 'Limited Event', title: 'Arena33 Mega Football Cup Starts In', subtitle: '',
    content: {
      description: 'Compete across Liga Super & EPL fixtures for a prize pool of merchandise and VIP match-day experiences.',
      target_date: '2026-11-15T20:00',
      button: { text: 'Enter the Cup', url: '#signup' }
    }
  },
  {
    section_key: 'steps', name: 'How it works',
    eyebrow: 'Getting Started', title: 'How to Start on Arena33',
    subtitle: 'Just 4 simple steps to begin your fantasy journey.',
    content: {
      anchor: 'how',
      items: [
        { title: 'Create Account', description: 'Sign up with your name, phone and email in under 2 minutes.' },
        { title: 'Log In', description: 'Access Arena33 securely from any device, any time.' },
        { title: 'Build Your Squad', description: 'Pick 11 players within your budget and choose a captain.' },
        { title: 'Compete & Win', description: 'Join leagues, track live points and climb the leaderboard.' }
      ]
    }
  },
  {
    section_key: 'comparison', name: 'Comparison table',
    eyebrow: 'Comparison', title: 'Arena33 vs Other Platforms',
    subtitle: 'See why Malaysian fans are switching to Arena33.',
    content: {
      our_label: 'Arena33', other_label: 'Others',
      rows: [
        { feature: 'Full Bahasa Melayu support', ours: '✓ Yes', others: '✕ No' },
        { feature: 'Liga Super Malaysia coverage', ours: '✓ Yes', others: '✕ No' },
        { feature: 'Esports fantasy leagues', ours: '✓ Yes', others: 'Limited' },
        { feature: 'Live scoring delay', ours: '< 10 sec', others: '1–5 min' },
        { feature: 'Weekly rewards', ours: '✓ Yes', others: '✕ No' },
        { feature: '24/7 customer support', ours: '✓ Yes', others: 'Office hours' }
      ]
    }
  },
  {
    section_key: 'plans', name: 'Membership plans',
    eyebrow: 'Membership', title: 'Choose the Plan That Fits You',
    subtitle: "From casual fans to hardcore managers — there's a plan for everyone.",
    content: {
      items: [
        { name: 'Basic', badge: '', price: 'RM 0', period: '/ month', featured: false,
          features: [{ text: '1 fantasy team', included: true }, { text: 'Public leagues', included: true }, { text: 'Basic player stats', included: true }, { text: 'Private leagues', included: false }, { text: 'Advanced analytics', included: false }],
          button: { text: 'Sign Up Free', url: '#signup' } },
        { name: 'Pro', badge: '⭐ Popular', price: 'RM 9.90', period: '/ month', featured: true,
          features: [{ text: '3 fantasy teams', included: true }, { text: 'Private leagues', included: true }, { text: 'Advanced analytics', included: true }, { text: 'Captain boost chips', included: true }, { text: 'Personal coach tips', included: false }],
          button: { text: 'Choose Pro', url: '#signup' } },
        { name: 'Elite', badge: '👑 Elite', price: 'RM 19.90', period: '/ month', featured: false,
          features: [{ text: 'Everything in Pro', included: true }, { text: 'Unlimited teams', included: true }, { text: 'Personal coach tips', included: true }, { text: 'Early access features', included: true }, { text: 'Exclusive merch drops', included: true }],
          button: { text: 'Go Elite', url: '#signup' } }
      ]
    }
  },
  {
    section_key: 'wheel', name: 'Daily bonus wheel',
    eyebrow: 'Free Every Day', title: 'Arena33 Daily Bonus Wheel',
    subtitle: 'Spin once a day for free in-game boosts — exclusive to registered members.',
    content: {
      button_text: 'Spin Now!',
      prizes: [
        { label: '2x Captain Boost', color: '#ef4444' },
        { label: '50 Coins', color: '#f59e0b' },
        { label: 'Free Transfer', color: '#22c55e' },
        { label: 'Try Again', color: '#06b6d4' },
        { label: '100 Coins', color: '#6366f1' },
        { label: 'Wildcard Chip', color: '#a855f7' },
        { label: 'Premium Day', color: '#ec4899' },
        { label: '25 Coins', color: '#14b8a6' }
      ]
    }
  },
  {
    section_key: 'testimonials', name: 'Testimonials',
    eyebrow: 'Testimonials', title: 'What Our Players Say',
    subtitle: 'Hear from fantasy managers across Malaysia.',
    content: {
      items: [
        { name: 'Hafiz R.', location: 'Kuala Lumpur', rating: 5, quote: 'Live scoring is super fast. I watch JDT matches and my points update almost instantly.' },
        { name: 'Syahrul A.', location: 'Johor Bahru', rating: 5, quote: 'Finally a fantasy game with Liga Super! My office league has 40 people now.' },
        { name: 'Norziana M.', location: 'Penang', rating: 4, quote: 'The MLBB fantasy mode is so fun. Stats page helps me pick the best squad every week.' }
      ],
      note: '*Sample testimonials for demonstration purposes.'
    }
  },
  {
    section_key: 'faq', name: 'FAQ',
    eyebrow: 'FAQ', title: 'Frequently Asked Questions', subtitle: '',
    content: {
      items: [
        { question: 'Is Arena33 free to join?', answer: 'Yes. Creating an account and joining the weekly free tournaments costs nothing.' },
        { question: 'Which leagues can I play?', answer: 'Malaysia Super League, the English Premier League, the AFC Champions League and popular esports titles such as MLBB and Valorant.' },
        { question: 'Can I play on my phone?', answer: 'Yes. Arena33 works in any mobile browser on iOS and Android with no app download required.' },
        { question: 'How are rewards delivered?', answer: 'Rewards such as merchandise, match tickets and e-vouchers are sent to winners within 7 working days.' }
      ]
    }
  },
  {
    section_key: 'cta', name: 'Final call to action',
    eyebrow: '', title: 'Ready to Build Your Dream Team?', subtitle: '',
    content: {
      anchor: 'signup',
      description: "Join over 120,000 Malaysian fans on Arena33. It's free.",
      button: { text: 'Create Free Account', url: '#signup' }
    }
  },
  {
    section_key: 'footer', name: 'Footer', is_fixed: true,
    eyebrow: '', title: '', subtitle: '',
    content: {
      about_text: "Malaysia's trusted fantasy football and esports community. Fast, fair and always with you, 24/7.",
      contact_email: 'support@arena33.example',
      columns: [
        { heading: 'NAVIGATION', links: [{ label: 'Home', url: '/' }, { label: 'Features', url: '#features' }, { label: 'Plans', url: '#plans' }, { label: 'How It Works', url: '#how' }] },
        { heading: 'ACCOUNT', links: [{ label: 'Sign Up', url: '#signup' }, { label: 'Log In', url: '#login' }, { label: 'FAQ', url: '#faq' }] },
        { heading: 'INFO', links: [{ label: 'About Us', url: '#about' }, { label: 'Terms & Conditions', url: '/terms' }, { label: 'Privacy Policy', url: '/privacy' }, { label: 'Sitemap', url: '/sitemap.xml' }] }
      ],
      copyright: '© {year} Arena33. All rights reserved. Demo website built for an interview assessment.'
    }
  }
];

module.exports = { settings, sections };
