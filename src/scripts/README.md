# Backend Scripts

## Gallery Image Migration

### migrate-gallery-images.js

This script updates all existing gallery images in the database to use the path format instead of fileId for the `imageId` field. This change is necessary to fix the issue with gallery images not displaying properly in the frontend.

#### Background

The issue was that the frontend's `IKImage` component expects a path parameter, but we were storing the ImageKit `fileId` in the database. This caused images to not display properly.

#### Changes Made

1. Modified the gallery routes to store the path instead of fileId in the `imageId` field
2. Added logic to extract the path from the URL when uploading images
3. Updated the delete and update routes to handle the new path-based format

#### Running the Migration

To update existing gallery images in the database, run:

```bash
node src/scripts/migrate-gallery-images.js
```

This script will:
1. Find all gallery images in the database
2. For each image using the old fileId format, find the corresponding file in ImageKit
3. Extract the path from the URL and update the `imageId` field
4. Log the results of the migration

#### Expected Output

```
MongoDB connected
Starting gallery image migration...
Found X gallery images to migrate
Found Y files in ImageKit
Updated image [id]: [old_id] -> [new_path]
...
Migration completed:
- X images updated successfully
- Y images had errors
- Z images skipped (already using path format)
MongoDB disconnected
```