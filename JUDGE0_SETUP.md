# Compiler Setup Guide

This guide will help you set up the built-in compiler for your website. The compiler supports 50+ programming languages including C++, Java, C#, Go, Rust, and more.

## 🎉 FREE Option: Piston API (Default - No Setup Required!)

**Good news!** The compiler now uses **Piston API by default**, which is **completely FREE** and requires **NO API key or configuration**!

### How it works:
- ✅ **No setup needed** - Works out of the box
- ✅ **Completely free** - No API keys, no subscriptions
- ✅ **Supports 20+ languages** - C++, Java, C#, Go, Rust, Python, JavaScript, TypeScript, and more
- ✅ **No rate limits** - Use as much as you need

### Just start coding!
The compiler will automatically use Piston API. No configuration needed!

---

## Option 1: Using RapidAPI Judge0 (Optional - For More Features)

RapidAPI provides a hosted Judge0 service that's easy to set up and use.

### Steps:

1. **Sign up for RapidAPI**
   - Go to [RapidAPI](https://rapidapi.com/)
   - Create a free account or sign in

2. **Subscribe to Judge0 API**
   - Search for "Judge0" in RapidAPI
   - Go to [Judge0 CE API](https://rapidapi.com/judge0-official/api/judge0-ce)
   - Click "Subscribe" and choose a plan (Free tier available with limits)

3. **Get your API Key**
   - After subscribing, go to your [RapidAPI Dashboard](https://rapidapi.com/developer/billing)
   - Copy your "X-RapidAPI-Key"

4. **Configure Environment Variable**
   - Open your `.env` file in the project root
   - Add the following line:
     ```env
     VITE_RAPIDAPI_KEY=your-rapidapi-key-here
     ```
   - Replace `your-rapidapi-key-here` with your actual RapidAPI key

5. **Restart your development server**
   ```bash
   npm run dev
   ```

## Option 2: Self-Hosted Judge0 (Optional - For Production)

For production use or higher limits, you can self-host Judge0 using Docker.

### Steps:

1. **Install Docker**
   - Install [Docker Desktop](https://www.docker.com/products/docker-desktop) if you haven't already

2. **Run Judge0 using Docker**
   ```bash
   docker run -d -p 2358:2358 -e MAX_QUEUE_SIZE=200 judge0/judge0:1.13.0
   ```

3. **Configure Environment Variables**
   - Open your `.env` file
   - Add the following:
     ```env
     VITE_JUDGE0_URL=http://localhost:2358
     ```
   - For production, replace `localhost` with your server's domain/IP

4. **Optional: Add Authentication Token**
   - If you've configured authentication for your Judge0 instance:
     ```env
     VITE_JUDGE0_AUTH_TOKEN=your-auth-token-here
     ```

5. **Restart your development server**
   ```bash
   npm run dev
   ```

## Option 3: Force Judge0 Instead of Piston (Optional)

If you want to use Judge0 instead of the free Piston API, you can force it:

1. **Add to your `.env` file:**
   ```env
   VITE_USE_JUDGE0=true
   ```
2. **Then configure one of the Judge0 options above** (RapidAPI or self-hosted)

## Supported Languages

Once configured, the following languages are supported:

- **C++** (cpp)
- **C** (c)
- **Java** (java)
- **C#** (csharp)
- **Go** (go)
- **Rust** (rust)
- **Python** (python) - Also works with Pyodide
- **JavaScript** (javascript) - Also works natively
- **TypeScript** (typescript) - Also works natively
- **PHP** (php)
- **Ruby** (ruby)
- **Swift** (swift)
- **Kotlin** (kotlin)
- **Scala** (scala)
- **Perl** (perl)
- **R** (r)
- **Bash** (bash)
- **SQL** (sql) - Also works with sql.js

## Testing the Setup

1. Navigate to any interview question page
2. Select a language like C++ or Java
3. Write some code
4. Click "Run Code"
5. If configured correctly, you should see the execution output

## Troubleshooting

### "Compiler not configured" Error
- Make sure you've added the environment variable to your `.env` file
- Restart your development server after adding the variable
- Check that the variable name starts with `VITE_`

### "Failed to submit code" Error
- Check your RapidAPI subscription status
- Verify your API key is correct
- For self-hosted: Make sure Docker container is running and accessible

### "Execution timeout" Error
- The code might be taking too long to execute
- Check if your code has infinite loops
- For self-hosted: Increase timeout in Judge0 configuration

### Rate Limit Errors
- RapidAPI free tier has rate limits
- Consider upgrading to a paid plan or self-hosting

## Production Deployment

For production:

1. **Use self-hosted Judge0** on your own server for better control
2. **Set up proper authentication** to secure your Judge0 instance
3. **Configure environment variables** in your hosting platform (Vercel, Netlify, etc.)
4. **Set up monitoring** to track API usage and errors

## Security Considerations

- Never commit your `.env` file to version control
- Use environment variables in your hosting platform
- For self-hosted Judge0, configure firewall rules to restrict access
- Consider implementing rate limiting on your application side

## Additional Resources

- [Judge0 Documentation](https://ce.judge0.com/)
- [RapidAPI Judge0](https://rapidapi.com/judge0-official/api/judge0-ce)
- [Judge0 GitHub](https://github.com/judge0/judge0)

