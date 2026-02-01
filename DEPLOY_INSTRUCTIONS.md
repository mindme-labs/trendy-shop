# Deployment Instructions for Vercel

## Step-by-Step Guide

### 1. Create Vercel Account
- Go to https://vercel.com/signup
- Click "Continue with GitHub"
- Authorize Vercel to access your GitHub account

### 2. Set Up GitHub Repository

Run these commands in the terminal (from the trendy-shop directory):

```bash
# Initialize git in this directory
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: TrendHunter prototype ready for deployment"

# Add your GitHub repository as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/trendy-shop.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Deploy to Vercel

**Method 1: Using Vercel Dashboard (Easiest)**

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Find and select `trendy-shop` from your GitHub repositories
5. Vercel will auto-detect the settings:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: (leave empty)
   - **Output Directory**: public
   - **Install Command**: npm install
6. Click **"Deploy"**
7. Wait 30-60 seconds for deployment to complete
8. You'll get a URL like: `https://trendy-shop-xxx.vercel.app`

**Method 2: Using Vercel CLI (Alternative)**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from trendy-shop directory)
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - What's your project's name? trendy-shop
# - In which directory is your code located? ./
# - Want to override settings? N

# For production deployment
vercel --prod
```

### 4. Share with Friends

After deployment, you'll receive a URL like:
`https://trendy-shop.vercel.app` or `https://trendy-shop-xxx.vercel.app`

Share this URL with your friends!

### 5. Automatic Deployments

Once connected to GitHub, Vercel will automatically:
- Deploy on every push to `main` branch
- Create preview deployments for pull requests
- Build and deploy in ~30 seconds

## Configuration Files Added

- `vercel.json` - Vercel configuration for Node.js app
- `.gitignore` - Updated to exclude Vercel files

## Environment Variables (if needed later)

If you need to add environment variables:
1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Add variables for all environments (Production, Preview, Development)

## Troubleshooting

### Issue: "Module not found"
- Make sure `node_modules` is in `.gitignore`
- Vercel will install dependencies automatically

### Issue: "404 Not Found"
- Check that `vercel.json` is in the root directory
- Verify routes configuration in `vercel.json`

### Issue: Embeds not loading
- This is expected behavior - TikTok/Instagram embeds may have CORS restrictions
- The app includes fallback UI for this scenario

## Free Tier Limits (Hobby Plan)

- ✅ Unlimited deployments
- ✅ 100 GB bandwidth per month
- ✅ Serverless function execution
- ✅ Automatic HTTPS
- ✅ Custom domains (limited)

Perfect for sharing with friends!

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
