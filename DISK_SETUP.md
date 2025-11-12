# Setting Up Persistent Disk on Render

Follow these steps to connect your app to a persistent disk so your data survives redeploys.

**Note**: You must be on a paid plan (Starter or higher) to use persistent disks.

## Step 1: Create the Persistent Disk

1. **Go to your Render Dashboard**
   - Navigate to [dashboard.render.com](https://dashboard.render.com)
   - Click on your service (named "scraper" or whatever you named it)

2. **Navigate to Disks Section**
   - In the left sidebar, click on **"Disks"**
   - Or scroll down to find the "Disks" section

3. **Add a New Disk**
   - Click the **"Add Disk"** or **"New Disk"** button

4. **Configure the Disk**
   - **Name**: `data` (or any name you prefer)
   - **Mount Path**: `/opt/render/project/persistent` ⚠️ **This must be exact!**
   - **Size**: `1` GB (or more if you expect lots of images/data)
   - Click **"Save"** or **"Create Disk"**

## Step 2: Redeploy Your Service

After adding the disk, you need to redeploy:

1. **Manual Redeploy** (Recommended)
   - Go to your service page
   - Click **"Manual Deploy"** → **"Deploy latest commit"**
   - Or click **"Redeploy"** if available

2. **Or Trigger via Git Push**
   - Push any commit to your repository
   - Render will automatically redeploy

## Step 3: Verify It's Working

After redeployment, check the logs:

1. **View Logs**
   - Go to your service page
   - Click on **"Logs"** tab
   - Look for this line: `✅ Using persistent disk at: /opt/render/project/persistent/data.db`

2. **If you see a warning instead:**
   ```
   ⚠️  Persistent disk not found at /opt/render/project/persistent
   ```
   - Double-check the mount path is exactly `/opt/render/project/persistent`
   - Make sure the disk was created successfully
   - Try redeploying again

## Step 4: Test Data Persistence

1. **Add some test data**
   - Create a rental or activity
   - Create a user account
   - Add some votes or comments

2. **Redeploy the service**
   - Trigger a manual redeploy

3. **Verify data is still there**
   - Log in with the same account
   - Check that your rentals/activities are still present
   - If data persists, you're all set! ✅

## Troubleshooting

### Disk Not Detected

**Problem**: Logs show warning about persistent disk not found

**Solutions**:
- Verify the mount path is exactly `/opt/render/project/persistent` (case-sensitive)
- Check that the disk status shows as "Attached" or "Mounted"
- Make sure you're on a paid plan (Starter or higher)
- Try redeploying after creating the disk

### Data Still Lost After Redeploy

**Problem**: Data disappears even after setting up the disk

**Solutions**:
- Check logs to confirm it's using the persistent disk path
- Verify the disk is actually mounted (check disk status in dashboard)
- Make sure you're not accidentally using a different service/environment
- Check that `NODE_ENV=production` is set

### Disk Full

**Problem**: Getting errors about disk space

**Solutions**:
- Go to Disks section
- Click on your disk
- Increase the size (you'll be charged for the additional space)

## Cost

- **Disk Storage**: ~$0.30 per GB per month
- **1 GB disk**: ~$0.30/month
- **5 GB disk**: ~$1.50/month
- Billed prorated to the second

For a trip planning app, 1 GB should be plenty unless you're storing many high-resolution images.

## Next Steps

Once the disk is set up and working:
- Your data will persist across all redeploys
- You can safely update your code without losing data
- The database will be backed up as part of Render's disk backups

