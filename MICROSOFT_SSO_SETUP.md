# Microsoft SSO Integration Setup Guide

This guide provides step-by-step instructions to set up Microsoft SSO authentication for the PEP Score Nexus application.

## 🎯 Overview

The Microsoft SSO integration allows Vijaybhoomi College students and staff to log in using their institutional Microsoft accounts (@vijaybhoomi.edu.in), with automatic validation against the college ERP system and intelligent linking to existing user accounts.

## 🔄 Enhanced Authentication Flow

### **Step-by-Step Process:**

1. **User clicks "Sign in with Microsoft"** → Redirects to Microsoft OAuth
2. **Microsoft Authentication** → User logs in with @vijaybhoomi.edu.in account
3. **ERP Validation** → System validates user exists in college ERP
4. **User Account Linking** → System intelligently links Microsoft account to existing user:
   - **By Microsoft ID**: If user already linked Microsoft account
   - **By Email**: If user exists with same email address
   - **By Username**: If user exists with matching username (email prefix)
   - **Create New**: Only if no existing user found (rare case)
5. **JWT Token Generation** → Creates application token for authenticated user
6. **Role-based Redirect** → Redirects user to appropriate dashboard

## 📋 Prerequisites

1. **Azure AD Admin Access**: You need admin access to your organization's Azure Active Directory
2. **College ERP Access**: The ERP authentication endpoint should be accessible
3. **Domain Verification**: Ensure @vijaybhoomi.edu.in domain is verified in Azure AD

## 🔧 Azure AD App Registration

### Step 1: Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: `PEP Score Nexus`
   - **Supported account types**: `Accounts in this organizational directory only (Vijaybhoomi only - Single tenant)`
   - **Redirect URI**: 
     - Platform: `Single-page application (SPA)`
     - URI: `http://localhost:8080/auth/callback`

### Step 2: Configure Authentication

1. Go to **Authentication** in your app registration
2. Add additional redirect URIs:
   - `http://localhost:3001/api/v1/auth/microsoft/callback` (Backend callback)
   - `https://your-production-domain.com/auth/callback` (Production frontend)
   - `https://your-production-domain.com/api/v1/auth/microsoft/callback` (Production backend)

3. Configure **Implicit grant and hybrid flows**:
   - ✅ Access tokens (used for implicit flows)
   - ✅ ID tokens (used for implicit and hybrid flows)

4. Set **Supported account types**: `Single tenant`

### Step 3: API Permissions

1. Go to **API permissions**
2. Add the following Microsoft Graph permissions:
   - `User.Read` (Delegated)
   - `email` (Delegated)
   - `profile` (Delegated)
   - `openid` (Delegated)

3. Click **Grant admin consent** for your organization

### Step 4: Certificates & Secrets

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `PEP Score Nexus Backend`
4. Set expiration: `24 months`
5. **Copy the secret value** - you'll need this for backend configuration

### Step 5: Get Application Details

Note down the following values from the **Overview** page:
- **Application (client) ID**
- **Directory (tenant) ID**
- **Client secret** (from previous step)

## ⚙️ Backend Configuration

### Step 1: Environment Variables

Create or update `backend/.env` with:

```env
# Microsoft SSO Configuration
MICROSOFT_CLIENT_ID=your_application_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_AUTHORITY=https://login.microsoftonline.com/your_tenant_id
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/v1/auth/microsoft/callback

# Frontend URL
FRONTEND_URL=http://localhost:8080

# ERP Configuration
ERP_BASE_URL=https://kos.vijaybhoomi.edu.in
ERP_AUTH_ENDPOINT=/spring/user_verification/authenticate
```

### Step 2: Database Schema

The database schema has been automatically updated with SSO fields:
- `microsoft_id` - Microsoft user ID
- `sso_provider` - SSO provider name ('microsoft')
- `erp_validated` - ERP validation status
- `first_name` - User's first name
- `last_name` - User's last name

## 🎨 Frontend Configuration

### Step 1: Environment Variables

Create or update `frontend/.env` with:

```env
# Microsoft SSO Configuration
VITE_MICROSOFT_CLIENT_ID=your_application_client_id
VITE_MICROSOFT_AUTHORITY=https://login.microsoftonline.com/your_tenant_id
VITE_MICROSOFT_REDIRECT_URI=http://localhost:8080/auth/callback
VITE_MICROSOFT_POST_LOGOUT_REDIRECT_URI=http://localhost:8080/login

# Backend API Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

## 🚀 Testing the Integration

### Step 1: Start the Application

1. **Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Step 2: Test SSO Login

1. Navigate to `http://localhost:8080/login`
2. You should see both:
   - Regular username/password login form
   - "Sign in with Microsoft" button
3. Click the Microsoft SSO button
4. You'll be redirected to Microsoft login
5. Use a @vijaybhoomi.edu.in email address
6. After successful authentication, you'll be redirected back to the application

### Step 3: Verify User Creation

1. Check the database `users` table
2. New SSO users should have:
   - `microsoft_id` populated
   - `sso_provider` set to 'microsoft'
   - `erp_validated` set to true
   - Appropriate role based on email pattern

## 🔍 Troubleshooting

### Common Issues

1. **"MSAL configuration error"**
   - Verify all environment variables are set correctly
   - Check that client ID and tenant ID are correct

2. **"Redirect URI mismatch"**
   - Ensure redirect URIs in Azure AD match your environment variables
   - Check both frontend and backend redirect URIs

3. **"User not found in ERP"**
   - Verify the email domain is @vijaybhoomi.edu.in
   - Check ERP endpoint accessibility
   - Ensure user exists in the college ERP system

4. **"Permission denied"**
   - Verify API permissions are granted in Azure AD
   - Check admin consent has been provided

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

Check browser console and backend logs for detailed error messages.

## 🔒 Security Considerations

1. **Token Storage**: Tokens are stored in sessionStorage for security
2. **Domain Validation**: Only @vijaybhoomi.edu.in emails are accepted
3. **ERP Validation**: All SSO users are validated against the college ERP
4. **HTTPS Required**: Use HTTPS in production for secure token transmission
5. **Token Expiration**: Implement proper token refresh mechanisms

## 📚 Additional Resources

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [MSAL.js Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications)
- [Azure AD App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

## 🆘 Support

For technical support or questions about the SSO integration:
1. Check the troubleshooting section above
2. Review Azure AD logs in the Azure Portal
3. Check application logs for detailed error messages
4. Contact the development team with specific error details
