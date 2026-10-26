exports.notFound = (req, res) => res.status(404).type('text/plain').send('Page not found');

exports.handleError = (err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Server error' });
  res.status(500).type('text/plain').send('Something went wrong. Check that MySQL is running and `npm run db:setup` has been run.');
};
