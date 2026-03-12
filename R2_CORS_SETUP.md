# Cloudflare R2 CORS Configuration

To allow image uploads from the frontend application, you must configure the CORS policy for your Cloudflare R2 bucket.

## Required CORS Policy

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **R2** > **Overview**.
3. Select your bucket (apply this to BOTH `ethiocars-images` and `payment-proofs`).
4. Go to the **Settings** tab.
5. Scroll down to **CORS Policy** and click **Edit CORS Policy**.
6. Paste the following JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://ethiocars18.onrender.com",
      "https://ais-dev-cnraxblievjnnhv36mmazo-71879332995.europe-west3.run.app",
      "https://ais-pre-cnraxblievjnnhv36mmazo-71879332995.europe-west3.run.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

7. Click **Save**.

## Why is this needed?
The frontend application uploads images directly to Cloudflare R2 using presigned URLs. Browsers block these cross-origin requests unless the R2 bucket explicitly allows them via a CORS policy.
