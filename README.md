# SAP MaxAttention Northeast Account Hub

A splash page listing all northeast accounts with links to their individual OneSAP dashboards.

## Live URL
`https://ne-onesap-hub.cfapps.us10.hana.ondemand.com` (after deploy)

## Adding an account

Edit `customers.json` and add an entry:

```json
{
  "slug": "acme",
  "name": "Acme Corp",
  "subtitle": "OneSAP at Acme",
  "url": "https://<account-approuter>.cfapps.us10.hana.ondemand.com",
  "accent": "#00AA44",
  "industry": "Manufacturing",
  "region": "Northeast"
}
```

Then redeploy: `cf push`

## Deploy

```bash
cf login -a <CF_API> -o <ORG> -s <SPACE>
cf push
```

## Tech
Static HTML served via CF `staticfile_buildpack`. No backend required.
