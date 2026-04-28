# 🚀 Deployment Checklist - Concert Ticketing Feature

**Feature:** Stadium Section Notification System with Dynamic Tickets  
**Status:** ✅ Development Complete & Verified  
**Next Phase:** Production Deployment  

---

## Pre-Deployment Verification ✅

- [x] Backend `/api/notify` endpoint created
- [x] Frontend notification function integrated
- [x] Dynamic ticket generation working (5-12 per section)
- [x] Randomization verified (rows, availability, prices)
- [x] Network communication tested (Playwright)
- [x] Backend logs confirming POST requests
- [x] Error handling with graceful fallback
- [x] CORS properly configured
- [x] Documentation complete
- [x] Code review ready

**Status:** Ready for Render.com deployment ✅

---

## Step 1: Create Telegram Bot

### Objective
Create a Telegram bot that will receive notifications when users click stadium sections.

### Instructions

1. **Open Telegram**
   - Use Telegram app or web.telegram.org

2. **Find @BotFather**
   - Search for "@BotFather" in Telegram
   - Tap to open conversation

3. **Create New Bot**
   - Send message: `/newbot`
   - BotFather responds with questions

4. **Provide Bot Information**
   - **Question:** What's the name of your bot?
   - **Answer:** Concert Ticketing System (or your choice)
   - **Question:** Give your bot a username...
   - **Answer:** concert_tickets_bot (or your choice, must end with `_bot`)

5. **Receive Bot Token**
   - BotFather sends a message with:
   ```
   Done! Congratulations on your new bot. You'll find it at t.me/concert_tickets_bot. 
   You can now add a description, about section and profile picture for your bot, see /help for a list of commands. 
   By the way, when you've finished creating your cool bot, ping our Bot Support if you want a better username for the bot. Just ping @BotSupport with your bot username and we'll see.
   
   Use this token to access the HTTP API: 123456789:ABCDefghijKLMNopqrstuvwxyz-1234567890
   ```
   - **Copy the token** (the long string starting with numbers and colon)

6. **Save Bot Token**
   - **Keep this safe** - you'll need it for Render environment variables
   - Example format: `123456789:ABCDefghijKLMNopqrstuvwxyz_1234567`

### ✅ Step 1 Complete When:
- [ ] Bot created in BotFather
- [ ] Token copied and saved securely

---

## Step 2: Create/Configure Chat for Notifications

### Objective
Create or select a chat where the admin will receive section click notifications.

### Option A: Private Chat with Bot (Recommended for Solo Admin)

1. **Start the bot**
   - Open Telegram
   - Search for your bot (e.g., `@concert_tickets_bot`)
   - Tap to open conversation
   - Send message: `/start`
   - Bot shows welcome (even if no handlers configured)

2. **Get Your Chat ID**
   - Send any message in chat with bot
   - Open another browser tab: `https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates`
   - Replace `{YOUR_TOKEN}` with your bot token from Step 1
   - Look for `"chat"` object:
   ```json
   {
     "ok": true,
     "result": [
       {
         "update_id": 123456789,
         "message": {
           "message_id": 1,
           "date": 1234567890,
           "chat": {
             "id": 987654321,  // ← THIS IS YOUR CHAT ID
             "type": "private",
             "first_name": "Admin"
           },
           "text": "test"
         }
       }
     ]
   }
   ```
   - **Copy the chat ID** (the number in `"id"`)

### Option B: Group Chat (Recommended for Team)

1. **Create a Telegram Group**
   - Telegram app → Menu → New Group Chat
   - Add your bot: Search and add `@concert_tickets_bot`
   - Give group a name: "Concert Admin Alerts"

2. **Get Group Chat ID**
   - Add @userinfobot to the group
   - Bot replies with group information
   - Find negative chat ID (groups have negative IDs): `-987654321`
   - **Copy the chat ID**

### Option C: Channel (For Broadcast, No Replies)

1. **Create a Telegram Channel**
   - Telegram app → Menu → New Channel
   - Give channel a name: "Concert Ticket Alerts"

2. **Add Your Bot**
   - Channel Settings → Administrators
   - Add your bot

3. **Get Channel Chat ID**
   - Send test message to channel
   - Check API as in Option A but look for `"channel"` objects
   - Chat ID format: `@concert_ticket_alerts` or `-1001234567890`

### ✅ Step 2 Complete When:
- [ ] Chat/Group/Channel created with bot added
- [ ] Chat ID obtained and saved

---

## Step 3: Deploy to Render.com

### Objective
Deploy the Node.js backend to Render.com cloud platform.

### Prerequisites
- [ ] GitHub account (required - Render deploys from GitHub)
- [ ] Bot token from Step 1
- [ ] Chat ID from Step 2

### Instructions

1. **Ensure Code is on GitHub**
   ```bash
   # In your project directory
   git add .
   git commit -m "Concert ticketing feature - ready for production"
   git push origin main
   ```
   - Code must be on GitHub for Render deployment

2. **Create Render Account**
   - Go to https://render.com
   - Click "Sign up"
   - Choose "Sign up with GitHub"
   - Authorize Render to access your GitHub repositories

3. **Create New Web Service on Render**
   - Dashboard → "New +" → "Web Service"
   - Connect your repository: Select the concert-ticketing repo
   - Confirm connection
   - Configure service:
     - **Name:** concert-backend (or your choice)
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `node backend/server.js`
     - **Region:** Choose closest to your users

4. **Add Environment Variables**
   - In Render dashboard, find "Environment" section
   - Add the following variables:

   | Key | Value | Example |
   |---|---|---|
   | `TELEGRAM_BOT_TOKEN` | Token from Step 1 | `123456789:ABCDefghijKLMNopqrstuvwxyz_1234567` |
   | `TELEGRAM_CHAT_ID` | Chat ID from Step 2 | `987654321` or `-987654321` |
   | `CORS_ORIGINS` | Your frontend URL(s) | `https://your-domain.com` |
   | `PORT` | Server port | `3000` |
   | `NODE_ENV` | Environment | `production` |

5. **Deploy**
   - Click "Create Web Service"
   - Render automatically deploys
   - Wait for status: "Live" (green check mark)
   - Copy the Render URL (e.g., `https://concert-backend.onrender.com`)

### ✅ Step 3 Complete When:
- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] Web Service created and deployed
- [ ] Status shows "Live" (green)
- [ ] Environment variables configured
- [ ] Render URL copied (e.g., `https://concert-backend.onrender.com`)

---

## Step 4: Update Frontend API URL

### Objective
Update the frontend to use the production backend URL instead of localhost.

### Instructions

1. **Open the frontend file**
   - File: `public/tickets-vegas.html`
   - Search for: `http://localhost:3000/api/notify`

2. **Replace with Production URL**
   - Find this line (around line 2020):
   ```javascript
   await fetch('http://localhost:3000/api/notify', {
   ```
   
   - Change to:
   ```javascript
   await fetch('https://concert-backend.onrender.com/api/notify', {
   ```
   
   - **Substitute:** `concert-backend.onrender.com` with your actual Render URL

3. **Save the file**
   ```bash
   git add public/tickets-vegas.html
   git commit -m "Update API endpoint for production"
   git push origin main
   ```

4. **Deploy Frontend**
   - If using Vercel, Netlify, or another frontend host:
     - Push updated code
     - Frontend automatically redeploys
   - If using Render for frontend too:
     - Also create static site service on Render
     - Or use separate frontend hosting

### ✅ Step 4 Complete When:
- [ ] Frontend file updated with production URL
- [ ] Changes committed and pushed
- [ ] Frontend redeployed

---

## Step 5: Smoke Testing

### Objective
Verify the complete system works end-to-end in production.

### Instructions

1. **Test Backend Endpoint (Direct)**
   ```bash
   curl -X POST https://concert-backend.onrender.com/api/notify \
     -H "Content-Type: application/json" \
     -d '{"sectionName":"TestSection"}'
   
   # Expected response:
   # {"success":true,"message":"Notification sent to admin",...}
   # Status: 200 OK
   ```

2. **Check Telegram Notification**
   - Look in your Telegram chat/group/channel
   - You should see message: `🚨 *New Interaction*...`
   - If you see it: **Telegram integration working!** ✅

3. **Test Web Application**
   - Open your frontend URL (production domain)
   - Navigate to ticket selection page
   - Click different stadium sections
   - Verify:
     - [ ] 5-12 random tickets appear
     - [ ] Prices vary (±$25 from base)
     - [ ] Rows randomized (1-30)
     - [ ] Availability randomized (1-6)
     - [ ] Telegram notifications appear (check your chat)

4. **Check Backend Logs**
   - Render Dashboard → Web Service → Logs
   - Should see entries like:
   ```
   [2026-04-27T...] POST /api/notify
   ✅ Telegram notification sent for Section 434
   ```

5. **Monitor for Errors**
   - Check browser console for errors
   - Check Render logs for warnings
   - All should be clean ✅

### ✅ Step 5 Complete When:
- [ ] Direct API test returns 200 OK
- [ ] Telegram notification received
- [ ] Web app shows 5-12 dynamic tickets
- [ ] Randomization working (rows, prices, availability)
- [ ] Backend logs show successful POST requests
- [ ] No errors in browser console
- [ ] No errors in Render logs

---

## Post-Deployment Configuration

### Optional: Scale or Monitor

**Monitoring:**
- Render Dashboard → Logs (real-time logs)
- Check notification frequency
- Monitor for any errors

**Scaling (if traffic increases):**
- Render Dashboard → Plan
- Upgrade from Free/Starter to higher tier
- Adjust CPU/RAM as needed

**Custom Domain (optional):**
- If you have a domain (e.g., api.concerttickets.com)
- Render Dashboard → Settings → Custom Domain
- Point DNS to Render
- Use custom domain in CORS_ORIGINS

---

## Rollback Plan

If something goes wrong:

### Option 1: Revert Last Code Change
```bash
git revert HEAD
git push origin main
# Render auto-redeploys with previous version
```

### Option 2: Disable Telegram Notifications
```bash
# In Render environment variables:
TELEGRAM_BOT_TOKEN=             # Leave empty
TELEGRAM_CHAT_ID=               # Leave empty
# Save changes
# System gracefully disables notifications but app continues working
```

### Option 3: Kill Deployment
- Render Dashboard → Web Service → Settings → Delete Service
- Reverts to previous version if you have one
- Or redeploy from GitHub

---

## Summary Checklist

### Before Deployment
- [ ] Code tested locally and pushed to GitHub
- [ ] Documentation reviewed
- [ ] Team notified

### Step 1: Telegram Setup
- [ ] Bot created via @BotFather
- [ ] Bot token saved securely
- [ ] Chat/Group/Channel created
- [ ] Chat ID obtained and saved

### Step 2: Render Deployment
- [ ] Render account created
- [ ] GitHub connected
- [ ] Web Service created
- [ ] Environment variables configured:
  - [ ] TELEGRAM_BOT_TOKEN
  - [ ] TELEGRAM_CHAT_ID
  - [ ] CORS_ORIGINS
  - [ ] PORT
  - [ ] NODE_ENV
- [ ] Deployment "Live" (green status)
- [ ] Render URL copied

### Step 3: Frontend Update
- [ ] API endpoint URL updated
- [ ] Code pushed to GitHub
- [ ] Frontend redeployed

### Step 4: Testing
- [ ] Backend endpoint test passed
- [ ] Telegram notification received
- [ ] Web app dynamic tickets working
- [ ] All randomization verified
- [ ] No error logs

### Post-Deployment
- [ ] Monitor logs for first 24 hours
- [ ] Share endpoint with team if needed
- [ ] Document any issues encountered

---

## Support & Troubleshooting

### Issue: "Endpoint not reachable"
- [ ] Check Render service status (should be "Live")
- [ ] Check CORS_ORIGINS configured correctly
- [ ] Clear browser cache and reload

### Issue: "No Telegram notifications"
- [ ] Verify TELEGRAM_BOT_TOKEN in Render env vars
- [ ] Verify TELEGRAM_CHAT_ID in Render env vars
- [ ] Check Render logs for any errors
- [ ] Ensure bot is in the chat/group/channel

### Issue: "Tickets not generating"
- [ ] Check browser console for fetch errors
- [ ] Verify API endpoint URL is correct
- [ ] Check that backend is responding 200 OK

### Issue: "CORS errors"
- [ ] Check browser console for "CORS" errors
- [ ] Update CORS_ORIGINS in Render with frontend URL
- [ ] Redeploy backend after changing env vars

### Quick Test Command
```bash
# Replace URLs with your actual production URLs
curl -X POST https://concert-backend.onrender.com/api/notify \
  -H "Content-Type: application/json" \
  -d '{"sectionName":"Test"}' \
  -v  # Verbose to see headers
```

---

## Success Criteria ✅

**Feature is successfully deployed when:**

1. ✅ Render web service shows "Live" status
2. ✅ Telegram notification received when API endpoint called
3. ✅ Frontend loads and responds to section clicks
4. ✅ 5-12 dynamic tickets appear on click
5. ✅ Ticket data is randomized (rows, prices, availability)
6. ✅ No errors in browser console
7. ✅ Backend logs show POST requests processed
8. ✅ CORS headers working (cross-origin requests allowed)
9. ✅ All team members have access to working system

---

## Timeline Estimate

- **Step 1 (Telegram Bot):** 5 minutes
- **Step 2 (Render Deployment):** 10-15 minutes (includes waiting for build)
- **Step 3 (Frontend Update):** 5 minutes
- **Step 4 (Smoke Testing):** 10-15 minutes
- **Total:** 30-50 minutes (depending on Render build speed)

---

## Next Steps

1. Complete steps 1-5 in order
2. Monitor logs for first day
3. Gather user feedback
4. Plan enhancements:
   - Add database logging for audit trail
   - Track which user clicked which section
   - Add more detailed Telegram notifications
   - Create admin analytics dashboard

---

**Prepared:** 2026-04-27  
**Feature Status:** ✅ Ready for Deployment  
**Good luck!** 🚀
