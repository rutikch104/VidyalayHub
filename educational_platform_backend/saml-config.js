// saml-config.js

const fs = require('fs');
const path = require('path');

// Correct the file extension to match your certificate's file extension
const certPathAtos = path.join(__dirname, 'wac_2020_dev_saml.crt');
const certPathAtosProd = path.join(__dirname, 'wac_2020_prd_saml.crt');
const certPathoKTA = path.join(__dirname, 'okta_new.cert');
const certAtos = fs.readFileSync(certPathAtos, 'utf-8');
const certAtosProd = fs.readFileSync(certPathAtosProd, 'utf-8');
const certOkta = fs.readFileSync(certPathoKTA, 'utf-8');


module.exports = {
    // Uncomment the following lines for local testing using Okta
    entryPoint: 'https://dev-77240310.okta.com/app/dev-77240310_buptest_1/exkf6id0eqBQVJrFt5d7/sso/saml',
    issuer: 'BUP-TEST-API',
    callbackUrl: 'http://localhost:4200/login/sso',
    audience: 'BUP-TEST-API',
    cert:  certOkta

    // entryPoint: 'https://wacstg.das.myatos.net/sso_cond2fa_256/SingleSignOnService',
    // issuer: 'BUP',
    // callbackUrl: 'https://api.bup-dev.myatos.net/login/sso',
    // audience: 'BUP',
    // cert:  certAtos
    
  };
  


