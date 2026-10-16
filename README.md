# LinkedIn AI Reply (Chrome extension)

Shows a floating **✨ AI Reply** button above any LinkedIn message box you click into, on the Messaging page or in the small chat pop-ups. It reads the open conversation and drafts a reply into the box. It never sends; you review, edit and press Send.

By default it uses **your Claude subscription** through Claude Code running on your computer, so no API key is needed.

## One-time setup
1. **Claude Code**: install it (https://code.claude.com/docs/en/setup), open a terminal, run `claude` once and sign in with your Claude account.
2. **Node.js**: install the LTS version from https://nodejs.org if `node -v` doesn't work.
3. **Load the extension**: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick the folder that directly contains `manifest.json`. If you loaded the older version, remove it first.
4. **Start the bridge**: double-click `bridge\start-bridge.bat`. Leave that window open (minimize it) while you use LinkedIn.
5. Click the extension's toolbar icon to open Settings, review the "About you" text, and click **Save & test**.
6. Refresh your LinkedIn tab. A "LinkedIn AI Reply is on" message confirms the extension loaded.

## Use
- Click into a message box. **✨ AI Reply** appears just above it. Click it to draft a reply; click again for a new version.
- The drafted reply is inserted into the box **and** shown in a panel where you can review, edit, **Copy** or **Insert into box** again.
- **▾** opens options: pick a goal (Interested, Ask for details, Politely decline, Thank) and add a one-off **Ask**. Tap the **🎤 mic** to dictate the Ask by voice instead of typing.
- Type a rough draft first, then click AI Reply, and it polishes your draft.
- **Alt+R** in a message box does the same as the button.

## Draft a message from a profile
On any LinkedIn profile, a **✨ Draft message** button sits at the bottom left. It reads the profile and fills one of your templates word for word:
- **Reach out** and **Ask for a referral**: short LinkedIn DMs written for this person.
- **Referred by someone**, **Application**, **No open position**, **Recruiter networking**, **Follow-up**, **After interview**: emails, with a Send from line and a Subject.

Add a role or paste the JD for sharper skill matching. Emails use the send-from address from Settings. Use **Copy message**, **Copy all**, or **Insert into LinkedIn box** after you open Message or Add a note. Anything the profile doesn't tell it, like a referrer or a date, stays in [brackets] for you to fill in.

## Your details (optional config file)
The extension ships with no personal data. You can either:
- **Fill in the Settings page** (toolbar icon) — values are saved in your browser, or
- **Keep them in a file**: copy `config.local.example.js` to `config.local.js` and fill in your name, background, emails, target role and stack. `config.local.js` is git-ignored and never published; its values override the blank defaults so you don't re-enter them after a reinstall.

If `config.local.js` is missing, the extension still loads and uses the Settings page values.

## Notes
- The AI only states facts you put in Settings → "Background & preferences". Add your rate, W2/C2C preference, locations and availability so it can answer recruiter questions.
- Each reply takes roughly 5-20 seconds with Claude Code. If you'd rather use an API key, switch the provider in Settings.
- The bridge listens only on 127.0.0.1 and accepts requests only from the extension.
- If the reply misreads the thread, LinkedIn may have changed its page layout. The extension then falls back to reading the raw page text around the message box.
