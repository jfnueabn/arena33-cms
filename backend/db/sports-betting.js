const slug = 'sports-betting';
const section = (key, name, template, title, content, eyebrow = '', subtitle = '') => ({
  section_key: `sports_${key}`, page_slug: slug, template, name, title, content, eyebrow, subtitle,
  is_visible: true, is_fixed: false
});

module.exports = {
  slug, name: 'Sports Betting', title: 'Sports Betting',
  content: {
    seo_title: 'Sports Betting Guide: Football, Badminton & Esports | LV55',
    seo_description: 'Explore sports categories, understand common market types, and read LV55 sports betting information for Malaysian sports fans.',
    seo_keywords: 'LV55 sports betting, football guide Malaysia, badminton, esports markets',
    og_image: '/images/sports-arena.svg', robots_index: '1'
  },
  sections: [
    section('hero', 'Hero', 'sports_hero', 'Every sport. Every moment. Your next match starts here.', {
      description: 'From Malaysian football to international badminton and competitive esports, explore the sports and market types that bring fans closer to the action.',
      primary_button: { text: 'Explore sports', url: '#sports-categories' }, secondary_button: { text: 'Contact us', url: '#footer' },
      preview_label: 'MATCH PREVIEW', preview_note: 'Illustrative scores and odds — not live data or available bets.',
      matches: [
        { league: 'Malaysia · Football', home: 'Johor', away: 'Selangor', score: '1 – 0', status: 'Sample fixture', markets: [{ label: 'Home', value: '1.85' }, { label: 'Draw', value: '3.20' }, { label: 'Away', value: '4.50' }] },
        { league: 'England · Football', home: 'Manchester', away: 'London', score: '2 – 1', status: 'Sample fixture', markets: [{ label: 'Home', value: '1.65' }, { label: 'Draw', value: '3.80' }, { label: 'Away', value: '5.20' }] },
        { league: 'International · Badminton', home: 'Player A', away: 'Player B', score: 'Set 2', status: 'Sample fixture', markets: [{ label: 'Player A', value: '2.40' }, { label: 'Player B', value: '1.55' }] }
      ],
      highlights: [{ value: '6', label: 'Sport categories' }, { value: '8', label: 'Market guides' }, { value: 'Mobile', label: 'Responsive browsing' }, { value: '18+', label: 'Adults only' }]
    }, 'For Malaysian sports fans'),
    section('categories', 'Sports Categories', 'sports_categories', 'Your favourite sports, in one place', {
      items: [
        { title: 'Football', icon: '⚽', badge: 'Fan favourite', description: 'Explore local and international football, from Liga Super to European club competitions.', tags: ['Liga Super', 'EPL', 'European football'], image: '', image_alt: 'Football', visible: true },
        { title: 'Badminton', icon: '🏸', badge: 'Local passion', description: 'Follow singles and doubles formats, tournament stages and the flow of each game.', tags: ['Singles', 'Doubles', 'BWF events'], image: '', image_alt: 'Badminton', visible: true },
        { title: 'Esports', icon: '🎮', badge: 'Competitive gaming', description: 'Discover team-based esports, match formats and the difference between a map and a series.', tags: ['MLBB', 'Dota 2', 'Valorant'], image: '', image_alt: 'Esports', visible: true },
        { title: 'Basketball', icon: '🏀', badge: 'Court action', description: 'Learn about match winners, points totals and handicap markets in basketball.', tags: ['NBA', 'International', 'League games'], image: '', image_alt: 'Basketball', visible: true },
        { title: 'Tennis', icon: '🎾', badge: 'Point by point', description: 'Understand how matches, sets and games relate to different tennis markets.', tags: ['ATP', 'WTA', 'Grand Slams'], image: '', image_alt: 'Tennis', visible: true },
        { title: 'More Sports', icon: '🏉', badge: 'Discover more', description: 'Explore rugby, cricket and other sports. Check the available events and rules at your chosen destination.', tags: ['Rugby', 'Cricket', 'Other sports'], image: '', image_alt: 'More sports', visible: true }
      ]
    }, 'Sports categories', 'Discover the sport first, then understand its markets and rules.'),
    section('about', 'About Sports Betting', 'bonus_about', 'Built around the way you follow sport', {
      paragraphs: ['A match is more than its final score. Competition format, team news and the rules of the sport provide useful context when reading sports information.', 'This page introduces common sports and market terminology. Any available events, prices and settlement rules must be checked on the linked platform.'],
      image: '/images/sports-arena.svg', image_alt: 'A floodlit sports arena in blue and gold', detail_title: 'Know what the numbers mean', detail_description: 'Odds describe a price, not a promise. A short price does not guarantee a result, and past performance does not determine the next match.'
    }, 'Closer to the game'),
    section('markets', 'Market Types', 'sports_markets', 'Understand the different market types', {
      items: [
        { title: 'Asian Handicap', icon: '🎯', description: 'A handicap adjusts the starting position used to settle a selection. Read the line and settlement rules carefully.' },
        { title: '1X2', icon: '1️⃣', description: 'Three possible match outcomes: home win, draw or away win. Check which period of play is included.' },
        { title: 'Over / Under', icon: '📊', description: 'A market based on whether a specified total finishes above or below a stated line.' },
        { title: 'Correct Score', icon: '🔢', description: 'A selection based on the exact final score for the specified period.' },
        { title: 'In-play Markets', icon: '⚡', description: 'Markets offered while an event is taking place. Prices and availability can change or be suspended.' },
        { title: 'Accumulator', icon: '🎟️', description: 'Multiple selections combined together. The outcome depends on all legs and the applicable settlement rules.' },
        { title: 'Outright Winner', icon: '🏆', description: 'A market on the overall winner of a tournament or competition rather than an individual fixture.' },
        { title: 'Player Markets', icon: '👤', description: 'Selections about a player’s performance, such as scoring. Participation and settlement rules vary.' }
      ]
    }, 'The basics', 'Clear explanations before you make any decision.'),
    section('steps', 'Getting Started', 'steps', 'Take time to understand your next step', {
      anchor: 'sports-getting-started', items: [
        { title: 'Explore a sport', description: 'Choose a category and learn the competition format.' },
        { title: 'Read the market', description: 'Check the selection, odds format and period of play.' },
        { title: 'Review the rules', description: 'Understand settlement, cancellation and any relevant restrictions.' },
        { title: 'Stay in control', description: 'Set personal limits and only participate if you can afford the risk.' }
      ]
    }, 'Getting started'),
    section('mobile', 'Mobile Experience', 'bonus_about', 'Follow the information wherever you are', {
      paragraphs: ['The landing page adapts to phones, tablets and larger screens. Sports cards, match previews and guides remain easy to browse without an app download.', 'For account access, current events or payment questions, use the official links supplied by LV55 or contact the team.'],
      image: '/images/sports-arena.svg', image_alt: 'Sports arena illustration', detail_title: 'Explore offers before you decide', detail_description: 'The Welcome Bonus page introduces member promotions and their terms. Confirm the current details before accepting an offer.'
    }, 'Made for mobile'),
    section('responsible', 'Responsible Participation', 'bonus_terms', 'Keep sport enjoyable', {
      anchor: 'sports-responsibility', items: ['For adults aged 18 and above only.', 'Set a personal budget and never use money needed for essentials.', 'Outcomes are uncertain. Do not treat betting as income or chase losses.', 'Take regular breaks and use available limit or exclusion tools when needed.'], note: 'This is an informational landing page. It does not take bets, process payments or display live prices.'
    }, 'Stay in control'),
    section('faq', 'FAQ', 'faq', 'Sports Betting questions', {
      items: [
        { question: 'Are the match scores and odds on this page live?', answer: 'No. The match panel is an editable illustration. Check the official destination for current events, scores, prices and availability.' },
        { question: 'Can I place a bet on this page?', answer: 'No. This page provides information about sports and market types. It has no bet slip, account balance or transaction processing.' },
        { question: 'What should I check before choosing a market?', answer: 'Read the sport rules, market description, odds format, settlement period and cancellation rules. Outcomes are never guaranteed.' },
        { question: 'Where can I find current offers?', answer: 'Visit the Welcome Bonus page for promotional information and confirm the latest terms with LV55.' },
        { question: 'What happens if an event is postponed?', answer: 'Settlement depends on the rules for that specific event and market. Check those rules with the official provider.' }
      ]
    }, 'Frequently asked questions'),
    section('cta', 'Call to Action', 'bonus_cta', 'Ready to explore more?', {
      description: 'Discover member offers or contact the team with questions about available sports and events.',
      button: { text: 'View Welcome Bonus', url: '/welcome-bonus' }, secondary_button: { text: 'Contact us', url: '#footer' }, note: '18+ · Know the rules · Participate responsibly'
    })
  ]
};
