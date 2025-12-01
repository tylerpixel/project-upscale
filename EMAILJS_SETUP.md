# EmailJS Setup Instructions

## Quick Setup

1. **Sign up for EmailJS**
   - Go to https://www.emailjs.com/
   - Create a free account (100 emails/month free)

2. **Create an Email Service**
   - Go to "Email Services" in the dashboard
   - Choose your email provider (Gmail, Outlook, etc.)
   - Follow the setup instructions
   - Note your **Service ID**

3. **Create an Email Template**
   - Go to "Email Templates"
   - Click "Create New Template"
   - Use this template structure:
     ```
     Subject: New message from {{from_email}}
     
     From: {{from_email}}
     
     Message:
     {{message}}
     ```
   - Note your **Template ID**

4. **Get your Public Key**
   - Go to "Account" → "General"
   - Copy your **Public Key**

5. **Update the Code**
   - Open `js/dm-app.js`
   - Find the `sendMessageToBackend` function
   - Replace these values:
     - `YOUR_SERVICE_ID` → Your Service ID
     - `YOUR_TEMPLATE_ID` → Your Template ID
     - `YOUR_PUBLIC_KEY` → Your Public Key

## Example Configuration

```javascript
const serviceId = "service_abc123"; // Your Service ID
const templateId = "template_xyz789"; // Your Template ID
const publicKey = "abcdefghijklmnop"; // Your Public Key
```

That's it! Messages will now be sent to your email address.

