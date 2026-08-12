const approuter = require('@sap/approuter');
const ar = approuter();

ar.first.use('/me', function(req, res) {
  try {
    let firstname = '', email = '';

    // Try req.user (set by approuter after XSUAA auth)
    if (req.user) {
      email = req.user.id || '';
      const name = req.user.name || '';
      firstname = name.split(' ')[0] || '';
    }

    // Decode JWT payload for richer claims
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
      const b64 = auth.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      if (!email) email = payload.email || payload.user_name || payload.sub || '';
      if (!firstname) {
        firstname = payload.given_name || payload.firstname ||
          (email ? email.split('@')[0].split('.')[0] : '');
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ firstname, email }));
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ firstname: '', email: '' }));
  }
});

ar.start();
