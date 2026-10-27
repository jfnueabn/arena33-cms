module.exports = [
  ...require('./page-sections')(require('./popular-games')),
  ...require('./welcome-bonus').sections,
  ...require('./sports-betting').sections,
  ...require('./virtual-sports').sections,
  ...require('./sports').sections,
  ...require('./match-odds').sections,
  ...require('./baccarat').sections
];
