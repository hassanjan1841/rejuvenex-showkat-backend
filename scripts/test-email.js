require('dotenv').config();
const { sendEmail } = require('../utils/email');
const dns = require('dns').promises;
const https = require('https');
const http = require('http');

async function checkInternetConnection() {
  console.log('Checking internet connection...');
  
  try {
    // Try to connect to Google's DNS server
    const dnsResult = await dns.lookup('8.8.8.8');
    console.log('DNS lookup successful:', dnsResult);
    
    // Try to connect to Gmail's SMTP server
    const smtpResult = await dns.lookup('smtp.gmail.com');
    console.log('SMTP DNS lookup successful:', smtpResult);
    
    return true;
  } catch (error) {
    console.error('Internet connection check failed:', error);
    return false;
  }
}

async function checkGmailAccessibility() {
  console.log('Checking Gmail accessibility...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'smtp.gmail.com',
      port: 587,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      console.log('Gmail accessibility check status code:', res.statusCode);
      console.log('Gmail accessibility check headers:', res.headers);
      resolve(res.statusCode < 400);
    });
    
    req.on('error', (error) => {
      console.error('Gmail accessibility check error:', error);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('Gmail accessibility check timed out');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

async function testEmail() {
  console.log('=== EMAIL CONFIGURATION TEST ===');
  console.log('Environment variables:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
  
  // Check internet connection
  const hasInternet = await checkInternetConnection();
  if (!hasInternet) {
    console.error('Internet connection check failed. Please check your network connection.');
    process.exit(1);
  }
  
  // Check Gmail accessibility
  const isGmailAccessible = await checkGmailAccessibility();
  if (!isGmailAccessible) {
    console.error('Gmail SMTP server is not accessible. This could be due to network restrictions or firewall settings.');
    console.error('Try using a different network or disabling your firewall temporarily.');
    process.exit(1);
  }
  
  try {
    console.log('\n=== SENDING TEST EMAIL ===');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'Test Email from Rejuvenex',
      text: 'This is a test email to verify the email configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6B46C1;">Test Email from Rejuvenex</h2>
          <p>This is a test email to verify the email configuration.</p>
          <p>If you're receiving this email, your email configuration is working correctly!</p>
        </div>
      `
    };

    console.log('Attempting to send test email...');
    const info = await sendEmail(mailOptions);
    console.log('Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response from server:', info.response);
  } catch (error) {
    console.error('\n=== EMAIL SENDING FAILED ===');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.code === 'EAUTH') {
      console.error('\nAuthentication failed. This is likely due to incorrect credentials or Gmail security settings.');
      console.error('For Gmail, make sure you are using an App Password, not your regular password.');
      console.error('See README.md for instructions on setting up Gmail App Password.');
    } else if (error.code === 'ECONNECTION') {
      console.error('\nConnection failed. This could be due to network issues or firewall settings.');
    } else if (error.code === 'ESOCKET') {
      console.error('\nSocket error. The email server might be down or unreachable.');
    }
    
    process.exit(1);
  }
}

testEmail(); 