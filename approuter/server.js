const approuter = require('@sap/approuter');
const ar = approuter();

// Set user cookie on every authenticated request so frontend can read it synchronously
ar.beforeRequestHandler.use(function(req, res, next) {
  if (req.user) {
    const email = (req.user.id || '').toLowerCase();
    const name  = req.user.name || '';
    const firstname = name.split(' ')[0] || email.split('@')[0].split('.')[0];
    const val = encodeURIComponent(JSON.stringify({ n: firstname, e: email }));
    res.setHeader('Set-Cookie', 'hub_u=' + val + '; Path=/; Max-Age=3600; SameSite=Lax; Secure');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
  next();
});

// /me endpoint as JSON fallback
ar.beforeRequestHandler.use('/me', function(req, res) {
  try {
    let firstname = '', email = '';
    if (req.user) {
      email = (req.user.id || '').toLowerCase();
      const name = req.user.name || '';
      firstname = name.split(' ')[0] || email.split('@')[0].split('.')[0];
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ firstname, email }));
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ firstname: '', email: '' }));
  }
});

ar.start();
