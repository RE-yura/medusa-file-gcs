# medusa-file-gcs

## Features

- Store product images on Google Cloud Storage.
- Support for importing and exporting data through CSV files, such as Products or Prices.
- Support for both private and public buckets.


## How to Install

1\. Run the following command in the directory of the Medusa backend:

  ```bash
  npm install @reyura/medusa-file-gcs
  ```

2\. Set the following environment variables in `.env`:

  ```bash
  GCS_PROJECT_ID=<GCS_PROJECT_ID>
  GCS_BUCKET=<GCS_BUCKET>
  GCS_PRIVATE_BUCKET=<GCS_PRIVATE_BUCKET>
  GCS_EMAIL=<GCS_EMAIL>
  GCS_PRIVATE_KEY=<GCS_PRIVATE_KEY>
  GCS_PRIVATE_EMAIL=<GCS_PRIVATE_EMAIL>
  GCS_PRIVATE_PRIVATE_KEY=<GCS_PRIVATE_PRIVATE_KEY>
  ```

3\. In `medusa-config.js` add the following at the end of the `plugins` array:

  ```js
  const plugins = [
    // ...
    {
      resolve: `@reyura/medusa-file-gcs`,
      options: {
        projectId: process.env.GCS_PROJECT_ID,
        bucketName: process.env.GCS_BUCKET,
        privatebucketName: process.env.GCS_PRIVATE_BUCKET,
        email: process.env.GCS_EMAIL,
        privateKey: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, "\n"),
        privateEmail: process.env.GCS_PRIVATE_EMAIL,
        privatePrivateKey: process.env.GCS_PRIVATE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
    },
  ]
  ```
