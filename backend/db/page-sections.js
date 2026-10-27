// Converts the original Popular Games document into independently editable sections.
module.exports = function pageSections(page) {
  const c = page.content;
  const section = (key, name, title, content, eyebrow = '', subtitle = '') => ({
    section_key: `games_${key}`, template: `games_${key}`, page_slug: 'popular-games',
    name, title, eyebrow, subtitle, content, is_visible: true, is_fixed: false
  });
  return [
    section('hero', 'Hero', page.title, { image: c.image, image_alt: c.image_alt, primary_button: c.primary_button, secondary_button: c.secondary_button }, page.eyebrow, page.subtitle),
    section('collection', 'Game Collection', c.collection_title, { games: c.games }, 'The collection', c.collection_description),
    section('about', 'About', c.about_title, { paragraphs: c.paragraphs }, 'About the collection'),
    section('providers', 'Providers', c.providers_title, { providers: c.providers }),
    section('guides', 'Guides', 'Explore game styles', { guides: c.guides }),
    section('faq', 'FAQ', c.faq_title, { items: c.faq, notice: c.notice }),
    section('cta', 'Call to Action', c.cta_title, { button: c.cta_button }, 'Get started', c.cta_description)
  ];
};
