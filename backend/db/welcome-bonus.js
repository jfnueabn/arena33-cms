const slug = 'welcome-bonus';
const section = (key, name, template, title, content, eyebrow = '', subtitle = '') => ({
  section_key: `bonus_${key}`, page_slug: slug, template, name, title, content, eyebrow, subtitle,
  is_visible: true, is_fixed: false
});

const page = {
  slug, name: 'Welcome Bonus', title: 'Welcome Bonus',
  content: {
    seo_title: 'Welcome Bonus & Member Offers | LV55 Malaysia',
    seo_description: 'Explore LV55 welcome offers, learn how to check eligibility, and review bonus terms before choosing an offer.',
    seo_keywords: 'LV55 welcome bonus, member offers, bonus information Malaysia',
    og_image: '', robots_index: '1'
  },
  sections: [
    section('hero', 'Hero', 'bonus_hero', 'A warm welcome to LV55', {
      description: 'Discover new member offers and find the details that matter before you get started.',
      primary_button: { text: 'Explore offers', url: '#bonus-offers' },
      secondary_button: { text: 'Contact us', url: '#footer' },
      image: '', image_alt: 'LV55 welcome rewards',
      card_label: 'WELCOME BONUS', card_value: 'More to discover', card_description: 'Explore rewards for your first steps with LV55.',
      highlights: [{ label: 'Eligibility', value: 'New members' }, { label: 'Offer details', value: 'See terms' }, { label: 'Questions?', value: 'Contact us' }]
    }, 'New member offers'),
    section('offers', 'Bonus Types', 'bonus_offers', 'Explore member offers', {
      notice: 'Sample offers for this preview. Confirm availability and full terms with LV55 before taking part.',
      offers: [
        { title: 'Welcome offer', icon: '🎁', badge: 'New members', benefit: 'Start with a welcome reward', description: 'Review the welcome offer and its eligibility requirements before joining.', image: '', image_alt: 'Welcome offer', button: { text: 'Ask about this offer', url: '#footer' }, visible: true },
        { title: 'Returning member offer', icon: '✨', badge: 'Discover', benefit: 'Something for your next visit', description: 'Ask which returning member promotions are currently available.', image: '', image_alt: 'Returning member offer', button: { text: 'Find out more', url: '#footer' }, visible: true },
        { title: 'Loyalty rewards', icon: '👑', badge: 'Members', benefit: 'Explore member benefits', description: 'Learn about available loyalty benefits and any conditions that apply.', image: '', image_alt: 'Loyalty rewards', button: { text: 'Explore benefits', url: '#footer' }, visible: true }
      ]
    }, 'Offer collection', 'Compare the options and read the details before choosing.'),
    section('about', 'About the Bonuses', 'games_about', 'Know what your offer includes', {
      paragraphs: ['An offer is easier to understand when its conditions are clear. Check who qualifies, what the benefit includes, and whether there are limits or an expiry date.', 'Read the terms alongside the headline benefit. If anything is unclear, contact the support team before accepting an offer.']
    }, 'The details matter'),
    section('steps', 'How to Claim', 'steps', 'Three steps to understand your offer', {
      anchor: 'how-to-claim', items: [
        { title: 'Choose an offer', description: 'Browse the available options and read the full details for the offer you are interested in.' },
        { title: 'Check eligibility', description: 'Confirm account requirements, qualifying actions, restrictions and the validity period.' },
        { title: 'Follow the offer instructions', description: 'Use the official destination or contact support for the current claim process.' }
      ]
    }, 'How to get started', 'A little preparation helps you choose with confidence.'),
    section('comparison', 'Bonus Comparison', 'bonus_comparison', 'Compare offers at a glance', {
      rows: [
        { offer: 'Welcome offer', eligibility: 'New members', benefit: 'See current offer', requirements: 'Check full terms', validity: 'Confirm before claiming' },
        { offer: 'Returning member offer', eligibility: 'Eligible members', benefit: 'See current offer', requirements: 'Offer-specific', validity: 'Check offer period' },
        { offer: 'Loyalty rewards', eligibility: 'Qualifying members', benefit: 'Depends on membership', requirements: 'Programme terms apply', validity: 'Check programme details' }
      ], note: 'This table is an overview. The full terms of each active offer take priority.'
    }, 'Offer overview'),
    section('methods', 'Payment Information', 'bonus_methods', 'Check eligible payment methods', {
      paragraphs: ['If an offer requires a payment, confirm which methods qualify before proceeding. Some promotions may have different requirements for different payment methods.'],
      methods: [], note: 'Contact support for the current list of eligible methods, processing times and any fees.'
    }, 'Before you begin'),
    section('terms', 'Terms & Conditions', 'bonus_terms', 'Important details to check', {
      items: ['Who is eligible and whether the offer is limited to one claim per member.', 'Any minimum qualifying action, maximum benefit or excluded activity.', 'Any play-through requirements and how they are calculated.', 'The claim deadline, expiry date and conditions for using or withdrawing rewards.', 'How to contact support about eligibility, restrictions or an unsuccessful claim.'],
      note: 'For adults aged 18 and above. Set personal limits, take breaks, and participate responsibly.'
    }, 'Read before claiming', 'Always review the full terms for the specific offer.'),
    section('faq', 'FAQ', 'faq', 'Welcome Bonus questions', {
      items: [
        { question: 'How do I find out whether I qualify?', answer: 'Read the eligibility rules for the specific offer. Contact support if you are unsure whether the requirements apply to your account.' },
        { question: 'Are the offers on this page currently available?', answer: 'The starting offers on this page are examples. Confirm the current offer details and availability with LV55 before taking part.' },
        { question: 'Where do I claim a bonus?', answer: 'Follow the official link or instructions provided for the offer. This landing page provides information and does not process claims or payments.' },
        { question: 'What should I read before accepting an offer?', answer: 'Check eligibility, qualifying requirements, restrictions, benefit limits, play-through conditions and expiry dates.' }
      ]
    }, 'Need more information?', 'Find answers before you choose an offer.'),
    section('cta', 'Call to Action', 'cta', 'Have a question about an offer?', {
      anchor: 'bonus-contact', description: 'Contact LV55 to confirm the latest offers and the terms that apply.', button: { text: 'Contact us', url: '#footer' }
    })
  ]
};

const find = key => page.sections.find(s => s.section_key === `bonus_${key}`);
Object.assign(find('hero'), {
  title: 'Welcome Bonus — a bigger start with LV55',
  eyebrow: 'Exclusive new member offers'
});
Object.assign(find('hero').content, {
  description: 'Explore our welcome package, compare member rewards, and find the offer that suits your next visit.',
  card_label: 'WELCOME PACKAGE', card_value: 'RM 588',
  card_description: 'Example maximum welcome reward. See the offer terms below.',
  highlights: [{ label: 'First deposit', value: '100%' }, { label: 'Minimum deposit', value: 'RM 30' }, { label: 'Play-through', value: '×8' }],
  sample_label: 'Illustrative offer', target_date: '', countdown_label: 'Offer ends in',
  countdown_empty: 'Check the current offer period with our team.',
  image: '/images/welcome-rewards.svg'
});
const offers = [
  ['Welcome Bonus', '🎁', 'Most popular', '100% up to RM 588', 'An introductory package for new members. Review the qualifying deposit, eligible games and play-through terms.'],
  ['Daily Reload', '💰', 'Daily', '20% up to RM 188', 'A sample returning-member offer with a daily claim period. Check the minimum qualifying amount and restrictions.'],
  ['Weekly Cashback', '💵', 'Weekly', '5% cashback', 'An example weekly reward. Review how eligible activity is calculated and when rewards are credited.'],
  ['Refer a Friend', '🤝', 'Referrals', 'RM 38 per referral', 'A sample referral benefit for qualifying invitations. Check what both members must complete before a reward is issued.'],
  ['VIP Loyalty', '👑', 'VIP', 'Exclusive member rewards', 'Explore tier-based benefits and personalised offers. Benefits depend on programme eligibility and current terms.'],
  ['Free Spins', '🎰', 'Selected games', 'Up to 100 spins', 'An example reward for selected titles. Check the game list, expiry date and any play-through requirements.']
];
find('offers').title = 'More ways to enjoy your membership';
find('offers').content.offers = offers.map(([title, icon, badge, benefit, description]) => ({ title, icon, badge, benefit, description, image: '', image_alt: title, button: { text: 'View offer details', url: '#bonus-terms' }, visible: true }));
find('about').template = 'bonus_about';
Object.assign(find('about').content, { image: '/images/welcome-rewards.svg', image_alt: 'Golden welcome gifts and rewards on a blue background', detail_title: 'A simple start, with the details in view', detail_description: 'Compare the offer, check your eligibility, and read the full conditions before deciding. Our team can help with questions about the current package.' });
const figures = [
  ['100%', 'RM 588', 'RM 30', '×8', '30 days'], ['20%', 'RM 188', 'RM 50', '×6', '1 day'],
  ['5%', 'See terms', 'See terms', '×1', '7 days'], ['Fixed', 'RM 38', 'Qualifying referral', '×5', '30 days'],
  ['By tier', 'By tier', 'By tier', 'See terms', 'Flexible'], ['—', '100 spins', 'RM 30', '×10', '7 days']
];
find('comparison').content.rows = offers.map((offer, i) => ({ offer: offer[0], eligibility: i === 0 ? 'New members' : 'Eligible members', benefit: figures[i][1], requirements: figures[i][3], validity: figures[i][4], percentage: figures[i][0], minimum_deposit: figures[i][2] }));
find('comparison').content.note = 'Illustrative figures for the preview, not confirmed LV55 offers. Replace these details with your approved promotion terms before publishing.';
find('methods').content.methods = ['Touch ’n Go', 'GrabPay', 'Boost', 'ShopeePay', 'DuitNow', 'FPX', 'Maybank2u', 'CIMB Clicks'];
find('methods').content.note = 'Examples of local payment methods. Confirm which methods are supported and eligible for each offer.';
find('cta').template = 'bonus_cta';
Object.assign(find('cta').content, { secondary_button: { text: 'Explore games', url: '/popular-games' }, note: '18+ · Participate responsibly · Full offer terms apply' });

module.exports = page;
