# Twilio WhatsApp Integration Setup Guide

## Overview
The Siva Medicals contact form now supports WhatsApp confirmations using Twilio. This guide explains what you need to do on the Twilio website to make it work.

---

## Step 1: Verify Your Twilio Account

### What you need:
- Twilio Account SID: YOUR_TWILIO_ACCOUNT_SID (already in `.env`)
- Twilio Auth Token: TWILIO_AUTH_TOKEN ✓ (already in `.env`)
- WhatsApp Number: TWILIO_WHATSAPP_NUMBER ✓ (already in `.env`)

### Check the connection:
Run the test endpoint on your server:
```
http://localhost:3001/api/twilio-test
```

Expected response:
```json
{
  "twilioClientReady": true,
  "accountSid": "Configured",
  "authToken": "Configured",
  "whatsappNumber": "+16626893955",
  "status": "Ready to Send"
}
```

---

## Step 2: Enable WhatsApp in Twilio Console

### Go to Twilio Console:
1. Login to [https://console.twilio.com](https://console.twilio.com)
2. Click **Messaging** in the left sidebar
3. Click **Send and Request Messages with Twilio**
4. Select **WhatsApp**

---

## Step 3: Set Up WhatsApp Sandbox

### Access the WhatsApp Sandbox:
1. In Twilio Console, go to **Messaging** → **Try it out** → **Send an SMS**
2. Look for **WhatsApp (Sandbox)** tab
3. You should see a code like: `join XXXXXX`

### Send Sandbox Join Message:
1. Send a WhatsApp message to the number shown in the Twilio console
2. The message should contain the join code (e.g., "join XXXXXX")
3. You'll get a confirmation from Twilio that you've joined the sandbox

### Example:
```
Send to Twilio WhatsApp number: +1 662-689-3955
Message: join gentle-river
```

---

## Step 4: Add Approved Phone Numbers

**Important:** In Twilio Sandbox mode, phone numbers MUST be approved first.

### To approve a phone number for testing:
1. In the Twilio Console, go to **Messaging** → **WhatsApp** → **Sandbox**
2. Find the **Approved Senders** section
3. Add the phone numbers that should receive WhatsApp messages:
   - Example: `+919952930484` (Siva Medicals phone number)

### Steps to add:
- Click **Add Sender**
- Enter the complete phone number with country code
- The number will be approved immediately for sandbox testing

---

## Step 5: Production Setup (Optional)

For **live production** (not sandbox), you need to:

1. **Verify Your Business**
   - Twilio will verify your business name and details
   - This can take 1-7 business days

2. **Get a WhatsApp Business Number**
   - Once verified, request a dedicated WhatsApp number
   - Or use an existing Twilio number

3. **Update WhatsApp Business Profile**
   - Set business category
   - Add website and contact info
   - Get approval from Meta (WhatsApp's parent company)

---

## Troubleshooting: Why Messages Aren't Being Sent

### 1. Recipient Phone Not Approved
❌ **Problem:** WhatsApp sandbox requires ALL recipient numbers to be pre-approved
- **Solution:** Add the phone number to Approved Senders in Twilio Console

### 2. Phone Number Format
❌ **Problem:** Phone number might be in wrong format
- **Solution:** Use E.164 format: `+[country-code][number]`
- Example: `+919952930484` (India)
- Not: `9952930484` or `919952930484`

### 3. Message Not Joining Sandbox
❌ **Problem:** Recipient didn't send the "join" message to Twilio
- **Solution:** Send WhatsApp message with join code to Twilio's WhatsApp number

### 4. Rate Limiting
❌ **Problem:** Too many messages in short time
- **Solution:** Sandbox has rate limits. Wait and retry.

### 5. Credentials Not Loaded
❌ **Problem:** `.env` file not being read
- **Solution:** 
  - Check `.env` file exists in project root
  - Restart the server: `npm start`
  - Check console logs for Twilio initialization messages

---

## Testing Your Setup

### Step 1: Monitor Server Logs
Start your server and watch the logs:
```
npm start
```

Look for:
```
✅ Twilio client initialized
📱 Twilio Account SID: AC675866...
📱 WhatsApp Number: +16626893955
```

### Step 2: Submit a Test Form
1. Open [http://localhost:3001/contact.html](http://localhost:3001/contact.html)
2. Fill in the form with:
   - **Phone:** Your approved WhatsApp number (e.g., `+919952930484`)
   - **Category:** "With Prescription" or any option
   - **Other fields:** Fill normally
3. Submit the form

### Step 3: Check Server Logs for Debug Info
Look for:
```
<!-- 🔍 WhatsApp Send Debug:
   Twilio Client Ready: true
   WhatsApp From Number: +16626893955
   User Phone: +919952930484
   Formatted Recipient: whatsapp:+919952930484
   Attempting to send WhatsApp...
✅ WhatsApp message sent successfully: SM1234567890abcdef -->
```

### Step 4: Watch for the WhatsApp Message
- If successful: You'll receive a WhatsApp message from Twilio
- If failed: Check the error message in server logs

---

## Message Flow Diagram

```
User fills form
    ↓
Form submits to /api/contact
    ↓
Backend validates data
    ↓
Saves to database
    ↓
Checks if Twilio configured
    ↓
Formats user phone number
    ↓
Sends WhatsApp via Twilio API
    ↓
Returns status (sent/failed) to frontend
    ↓
User sees confirmation message
```

---

## API Response Examples

### Success Response:
```json
{
  "success": true,
  "message": "Message sent successfully",
  "whatsapp": {
    "enabled": true,
    "status": "sent",
    "error": null,
    "notes": "Check server logs for detailed WhatsApp send diagnostics"
  }
}
```

### Failed Response:
```json
{
  "success": true,
  "message": "Message sent successfully",
  "whatsapp": {
    "enabled": true,
    "status": "failed",
    "error": "Invalid To number. Must be a valid phone number in E.164 format.",
    "notes": "Check server logs for detailed WhatsApp send diagnostics"
  }
}
```

---

## Sandbox vs. Production

| Feature | Sandbox | Production |
|---------|---------|------------|
| Cost | FREE | Paid per message |
| Approved Numbers | Must manually add | Automatic |
| Testing Phase | Perfect for testing | Live messages |
| Message Rate | Limited | Higher rates allowed |
| Business Verification | Not needed | Required |
| Setup Time | Instant | 1-7 days |

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Twilio could not find a Channel with the specified From address` (Code 63007) | WhatsApp sender number not configured | See **ERROR FIX BELOW** |
| `Twilio client not initialized` | Missing credentials | Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to `.env` |
| `Invalid To number` | Wrong phone format | Use E.164: `+919952930484` |
| `MessageProcessor - Account not authorized` | Recipient not approved | Add to Approved Senders in Twilio |
| `Number not in sandbox` | Recipient didn't join sandbox | Send "join [code]" message to Twilio |
| `Rate limit exceeded` | Too many messages | Wait 60 seconds before retrying |

---

## 🔴 CRITICAL ERROR FIX: "Could not find a Channel with the specified From address"

**Error Code:** `63007`  
**Meaning:** The WhatsApp number you're sending FROM is not properly configured in Twilio.

### ⚠️ YOU ARE HERE - FOLLOW THESE STEPS EXACTLY:

#### Option 1: Use the Twilio Sandbox Number (FASTEST - 5 minutes)

**Step 1: Find Your Sandbox Number**
1. Go to: [https://console.twilio.com](https://console.twilio.com)
2. Click: **Messaging** → **Send and Request Messages with Twilio** → **WhatsApp** (in left sidebar)
3. Look at the page - you'll see a Twilio sandbox WhatsApp number like:
   - **+1 662-689-3955** or similar
   - Or a messaging code like "join gentle-river"

**Step 2: Update Your `.env` File**
Replace the current TWILIO_WHATSAPP_NUMBER with the **SANDBOX NUMBER from Twilio Console**:

```
````
#####TWILIO_WHATSAPP_NUMBER=+1662689395
```

NOT the number you have now (+16626893955).

**Step 3: Save and Restart Server**
```bash
npm start
```

**Step 4: Retry the Form**
1. Open: `http://localhost:3001/contact.html`
2. Fill form and submit
3. Check server logs - should now show:
   ```
   ✅ WhatsApp message sent successfully: SM[ID]
   ```

---

#### Option 2: Set Up a Real WhatsApp Business Number (SLOWER - 2-7 days)

**Step 1: Request a WhatsApp Business Number**
1. Go to: [https://console.twilio.com](https://console.twilio.com)
2. Click: **Messaging** → **WhatsApp** → **Senders**
3. Click: **Request Production Number** or **Get a Number**
4. Follow Twilio's verification process

**Step 2: Update `.env` with New Number**
```
TWILIO_WHATSAPP_NUMBER=[your-new-production-number]
```

**Step 3: Wait for Approval**
- Twilio: 1-3 business days
- WhatsApp/Meta: 3-7 business days
- Total: Up to 7 days

---

### QUICKEST SOLUTION (Recommended):
**Use Option 1 (Sandbox)** - Get it working in 5 minutes!

**Action Now:**
1. Check Twilio Console for your sandbox WhatsApp number
2. Copy the EXACT number (including +1 and area code)
3. Update `.env` with that number
4. Restart server
5. Test again

---

## Next Steps

1. ✅ Credentials are in `.env` file
2. ✅ Backend is configured
3. ⏳ You need to:
   - Join Twilio WhatsApp Sandbox (send "join" message)
   - Add phone numbers to Approved Senders
   - Test the form with your number

---

## Server Test Endpoint

Check Twilio configuration anytime:
```
GET http://localhost:3001/api/twilio-test
```

---

## Support

For Twilio-specific issues, check:
- [Twilio WhatsApp Docs](https://www.twilio.com/docs/whatsapp)
- [Twilio Phone Number Format](https://www.twilio.com/docs/glossary/what-e164)
- [Twilio Console](https://console.twilio.com)

For form/contact issues, check server logs with:
```
npm start
```

---

**Last Updated:** April 5, 2026
**Status:** Sandbox Testing Mode
