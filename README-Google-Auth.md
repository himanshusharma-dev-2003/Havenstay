# Google OAuth 2.0 Setup Guide for HavenStay

This document explains how to set up Google Authentication for the HavenStay application.

## 1. Google Cloud Console Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. In the sidebar, navigate to **APIs & Services** > **Credentials**.

## 2. OAuth Consent Screen
1. Before creating credentials, you must configure the OAuth Consent Screen.
2. Click **Configure Consent Screen**.
3. Choose **External** (unless you have a Google Workspace and want to restrict to internal users).
4. Fill in the required fields (App name: HavenStay, User support email, Developer contact information).
5. You don't need to add any specific scopes beyond the defaults (`email`, `profile`, `openid`).
6. Save and continue. Add test users if your app is still in testing mode.

## 3. Creating OAuth Client ID
1. Go back to **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Select **Web application** as the Application type.
4. Name it (e.g., "HavenStay Web Client").

## 4. Authorized JavaScript Origins and Redirect URIs
Under the same credential screen, configure the following:

**Authorized JavaScript origins:**
- For local development: `http://localhost:3000`
- For production: `https://your-frontend-domain.com` (e.g., Vercel URL)

**Authorized redirect URIs:**
*(Note: Because we use the frontend popup flow via `@react-oauth/google`, redirect URIs might not strictly be required to be hit, but it's good practice to add them if you switch to redirect flow later).*
- For local development: `http://localhost:3000`
- For production: `https://your-frontend-domain.com`

## 5. Required Environment Variables

Once you create the client, you will get a **Client ID**. You do *not* need the Client Secret for this specific implementation (because we verify the ID token generated purely on the frontend).

Add the Client ID to your environment files:

**Backend (`server/.env`):**
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**Frontend (`client/.env`):**
```env
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## 6. Local Testing
1. Ensure both `.env` files have the correct `GOOGLE_CLIENT_ID`.
2. Start the backend: `npm run dev` in the `server` directory.
3. Start the frontend: `npm start` in the `client` directory.
4. Navigate to `http://localhost:3000/auth` and test the Google Login button.

## 7. Production Deployment
- **Vercel (Frontend)**: Add `REACT_APP_GOOGLE_CLIENT_ID` to your project environment variables in the Vercel dashboard.
- **Render/Railway (Backend)**: Add `GOOGLE_CLIENT_ID` to your backend environment variables in the Render/Railway dashboard.
- Ensure the production domains are added to the **Authorized JavaScript origins** in Google Cloud Console.

## Common Errors
- `invalid_client`: Your Client ID is incorrect.
- `Cross-Origin-Opener-Policy`: Standard warning when testing locally; it does not block the login.
- `unauthorized_client`: Ensure your domain is explicitly added to the Authorized JavaScript origins in the Cloud Console.
