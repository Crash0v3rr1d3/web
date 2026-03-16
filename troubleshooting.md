# Troubleshooting Guide: Astro Dev Server (localhost:4321)

If you are unable to access `http://localhost:4321`, follow these steps to identify and resolve the issue.

## 1. Check if the Server is Running
The most common reason for the site being down is that the development server is not running. 

**Solution:**
Open your terminal in the project root and run:
```bash
npm run dev
```
Alternatively, you can use:
```bash
npm start
```

## 2. Verify Port Availability
If the server fails to start, another process might be using port `4321`.

**Check for conflicts:**
```bash
lsof -i :4321
```
If this command returns output, a process is already using the port. You can kill it using:
```bash
kill -9 <PID>
```
*(Replace `<PID>` with the process ID from the `lsof` output)*

## 3. Clear Astro Cache
Sometimes the `.astro` cache gets corrupted, causing build or runtime errors.

**Solution:**
Stop the server (if running) and remove the `.astro` directory:
```bash
rm -rf .astro
npm run dev
```

## 4. Reinstall Dependencies
If you've recently updated your environment or pulled changes, dependencies might be missing or mismatched.

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 5. Node.js Version Compatibility
Ensure you are using a compatible Node.js version (Astro typically requires v18.17.1, v20.3.0, or higher).

**Check version:**
```bash
node -v
```

## 6. Check Environment Variables
Ensure your `.env` file is present and contains the necessary keys if the application logic depends on them.

**Current `.env` check:**
- `RANSOMWARE_API_KEY`: Required for data syncing.
