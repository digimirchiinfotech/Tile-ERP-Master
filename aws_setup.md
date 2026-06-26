# AWS S3 & Object Lock Setup Guide

This guide will walk you through setting up an Amazon S3 bucket with Object Lock enabled, creating a secure IAM user, and generating the necessary credentials for your Tile ERP backup system.

## Step 1: Create the S3 Bucket with Object Lock

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. In the search bar at the top, type **S3** and select it.
3. Click the **Create bucket** button.
4. **General configuration:**
   - **Bucket name:** Enter a unique name (e.g., `tile-erp-backups-2026`).
   - **AWS Region:** Select a region close to your server (e.g., `us-east-1` for N. Virginia). *Note down this region.*
5. **Object Ownership:** Keep "ACLs disabled (recommended)".
6. **Block Public Access settings:** Keep **"Block all public access"** CHECKED. You do not want backups to be public.
7. **Bucket Versioning:** Select **Enable**. *(Required for Object Lock)*.
8. **Advanced settings -> Object Lock:**
   - Select **Enable**.
   - Check the box acknowledging that enabling Object Lock is permanent.
9. Click **Create bucket** at the bottom of the page.

*(Note: We don't configure a default retention rule here because our code specifically requests a 90-day Governance lock per file dynamically).*

## Step 2: Create a Security Policy for the App

To ensure least-privilege, we will create a policy that ONLY allows the app to upload, download, and apply locks to this specific bucket.

1. In the AWS Console search bar, type **IAM** and select it.
2. On the left sidebar, click **Policies**, then click **Create policy**.
3. Choose the **JSON** tab and paste the following policy. Replace `YOUR-BUCKET-NAME` with the exact name of the bucket you created in Step 1:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowBucketListing",
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
        },
        {
            "Sid": "AllowBackupOperations",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:PutObjectRetention"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```
4. Click **Next**, give the policy a name like `TileERP-Backup-Policy`, and click **Create policy**.

## Step 3: Create an IAM User for the Backend

Now we create the "machine user" that your server will use to log in.

1. In the IAM dashboard, click **Users** on the left sidebar, then click **Create user**.
2. **User name:** Enter a name like `tile-erp-backup-user`. Do NOT check the "Provide user access to the AWS Management Console" box. Click **Next**.
3. **Permissions options:** Select **Attach policies directly**.
4. In the search box, search for the policy you just created (`TileERP-Backup-Policy`). Check the box next to it and click **Next**.
5. Review the details and click **Create user**.

## Step 4: Generate Access Keys

1. Click on the user you just created (`tile-erp-backup-user`) from the Users list.
2. Go to the **Security credentials** tab.
3. Scroll down to the **Access keys** section and click **Create access key**.
4. Select **Application running outside AWS** and click **Next**.
5. Click **Create access key**.
6. **IMPORTANT:** This is the ONLY time AWS will show you the Secret Access Key. Keep this page open while you copy the credentials into your application.

## Step 5: Update Your Environment Variables

Add the credentials you just generated to your `.env` file (or your Railway / Vercel Environment Variables configuration):

```env
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
AWS_REGION=your-region-here (e.g., us-east-1)
AWS_S3_BUCKET=your-bucket-name-here
```

Your backend is now securely connected to AWS S3, and your database backups will be permanently locked against ransomware for 90 days!
