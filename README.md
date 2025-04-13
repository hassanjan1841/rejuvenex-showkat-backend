# Rejuvenexx Backend

## Email Configuration

To set up email functionality with Gmail, follow these steps:

1. Enable 2-Step Verification on your Google Account:
   - Go to your Google Account settings
   - Navigate to Security
   - Enable 2-Step Verification if not already enabled

2. Generate an App Password:
   - Go to your Google Account settings
   - Navigate to Security
   - Under "Signing in to Google," select "App passwords"
   - Select "Mail" as the app and "Other" as the device
   - Enter a name for the app password (e.g., "Rejuvenexx Backend")
   - Click "Generate"
   - Google will display a 16-character password

3. Update your .env file:
   - Replace the EMAIL_PASS value with the 16-character app password you generated
   - Make sure EMAIL_USER is set to your Gmail address

Example .env configuration:
```
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # Your 16-character app password
```

Note: The app password is a 16-character code with spaces. You can include or remove the spaces in your .env file.

## Troubleshooting Email Issues

If you encounter email sending errors:

1. Verify your Gmail account has 2-Step Verification enabled
2. Make sure you're using an App Password, not your regular Gmail password
3. Check that your .env file has the correct credentials
4. Ensure your Gmail account doesn't have additional security restrictions

For more information, visit: https://support.google.com/mail/answer/185833 