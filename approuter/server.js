const approuter = require('@sap/approuter');
const ar = approuter();

ar.beforeRequestHandler.use(function(req, res, next) {
  const auth = req.authInfo || null;
  const user = req.user || null;

  let email = '', firstname = '';

  if (auth) {
    try { email     = (typeof auth.getEmail      === 'function' ? auth.getEmail()      : '') || ''; } catch(e){}
    try { firstname = (typeof auth.getGivenName  === 'function' ? auth.getGivenName()  : '') || ''; } catch(e){}
    if (!firstname) {
      try { firstname = (typeof auth.getLogonName === 'function' ? auth.getLogonName() : '') || ''; } catch(e){}
    }
  }

  // Fall back to req.user
  if (!email && user)     email     = (user.id   || '').toLowerCase();
  if (!firstname && user) firstname = (user.name || '').split(' ')[0];

  // Derive firstname from email if still empty
  if (!firstname && email.includes('@')) {
    firstname = email.split('@')[0].split('.')[0];
  }

  if (firstname || email) {
    const val = encodeURIComponent(JSON.stringify({ n: firstname, e: email.toLowerCase() }));
    res.setHeader('Set-Cookie', 'hub_u=' + val + '; Path=/; Max-Age=3600; SameSite=Lax; Secure');
  }
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  next();
});

// /me as JSON fallback
ar.beforeRequestHandler.use('/me', function(req, res) {
  const auth = req.authInfo || null;
  const user = req.user || null;
  let email = '', firstname = '';
  if (auth) {
    try { email     = (typeof auth.getEmail     === 'function' ? auth.getEmail()     : '') || ''; } catch(e){}
    try { firstname = (typeof auth.getGivenName === 'function' ? auth.getGivenName() : '') || ''; } catch(e){}
  }
  if (!email && user) email = (user.id || '').toLowerCase();
  if (!firstname) firstname = (email.includes('@') ? email.split('@')[0].split('.')[0] : (user && user.id) || '');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ firstname, email: email.toLowerCase() }));
});

ar.start();
