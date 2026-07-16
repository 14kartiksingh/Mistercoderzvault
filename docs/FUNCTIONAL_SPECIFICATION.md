# MISTER CODERZ Vault Functional Specification

This document defines the functional behavior of the MISTER CODERZ Vault. It covers user and administrative workflows, non-functional requirements, and outstanding product decisions. No technical implementation details are described here.

## 1. Admin Upload Workflow

### 1.1 Overview
The admin must be able to upload a single file, assign relevant metadata, and publish it as an Asset.

### 1.2 Success Flow
1. **Access**: Admin clicks the "Upload" button (accessible only in Admin mode).
2. **Form Interaction**: Admin selects a file from their local system. The system auto-detects the file size and extension (File Type).
3. **Data Entry**: Admin inputs the Title, selects a Category, adds Tags, specifies a Version, enters a Description, and selects Visibility (Public/Private/Admin-Only).
4. **Thumbnail Selection**: Admin uploads or links a Thumbnail image.
5. **Submission**: Admin clicks "Publish Asset".
6. **Upload Progress**: A progress bar indicates the upload status.
7. **Completion**: Upon successful upload to the storage backend, the system displays a success toast notification and redirects the admin to the newly created Asset page.

### 1.3 Failure Flow
- **Validation Errors**: If required fields (e.g., Title, Category) are missing, the "Publish Asset" button remains disabled or displays inline error messages upon submission attempt.
- **File Size/Type Errors**: If the file exceeds maximum limits or is of a prohibited type, a clear error message is shown immediately upon selection.
- **Network Interruptions**: If the upload drops midway, the progress bar halts, turns red, and an option to "Retry Upload" is provided.
- **Backend Rejection**: If the server rejects the payload, a toast notification detailing the specific error (e.g., "Storage unavailable") is shown.

---

## 2. Public Browsing Workflow

### 2.1 Overview
Public users land on the homepage to discover and browse assets.

### 2.2 Success Flow
1. **Landing**: User arrives at the homepage. The latest public assets are shown in the "New Uploads" section.
2. **Navigation**: User clicks a Category card (e.g., "Games").
3. **Filtering**: The view transitions to a grid displaying only assets within the "Games" category.
4. **Pagination**: As the user scrolls to the bottom, new assets load seamlessly (infinite scroll) or pagination controls allow navigating to the next page.

### 2.3 Failure Flow
- **Empty Category**: If a category has no public assets, a friendly empty state is shown (e.g., "No assets found in this category yet.").
- **Load Failure**: If the backend fails to fetch the list of assets, a generic error message with a "Retry" button is displayed in place of the asset grid.

---

## 3. Search Behaviour

### 3.1 Overview
Users can search the vault globally from the header search bar.

### 3.2 Success Flow
1. **Interaction**: User types a query into the search bar.
2. **Execution**: The search executes automatically after a brief debounce period (e.g., 300ms) or when the user presses Enter.
3. **Scope**: The system searches against the Asset Title, Tags, and Description.
4. **Results**: A dropdown or a new results page displays matching assets, highlighting the matched terms if possible.

### 3.3 Failure Flow
- **No Results**: If no assets match, the UI displays "No results found for '[query]'. Try adjusting your search terms."
- **Search Error**: If the search service times out, an error toast ("Unable to complete search at this time") appears.

---

## 4. Asset Page Layout

### 4.1 Overview
The detailed view of a single asset.

### 4.2 Layout Structure
- **Header Section**: Features the Thumbnail prominently, alongside the Title, Category, File Type, Version, and Size.
- **Action Section**: A clear, primary "Download" button.
- **Metadata Section**: Displays Tags and custom Metadata key-value pairs in a readable grid.
- **Description Section**: Renders the rich-text or markdown description of the asset.

---

## 5. Download Workflow

### 5.1 Overview
Users acquire the physical file associated with an Asset.

### 5.2 Success Flow
1. **Initiation**: User clicks the "Download" button on an Asset page.
2. **Verification**: The system verifies the asset's Visibility. If Public, the download initiates immediately.
3. **Feedback**: A visual cue (e.g., a spinner replacing the download icon temporarily) indicates the request is processing.
4. **Completion**: The browser's native download manager takes over as the file transfer begins.

### 5.3 Failure Flow
- **Permission Denied**: If a public user attempts to download an Admin-Only asset via a direct link, an "Access Denied" modal is shown.
- **File Missing**: If the backend cannot locate the physical file in storage, a "File Unavailable" error toast is displayed.
- **Rate Limiting**: If the user has exceeded download limits, a notification explaining the timeout period is shown.

---

## 6. Non-Functional Requirements

### 6.1 Performance
- **Load Times**: The homepage and asset pages must render above-the-fold content in under 1.5 seconds on standard broadband.
- **Search Latency**: Search results should be returned and rendered within 500ms.

### 6.2 Security
- **Asset Protection**: Private and Admin-Only assets must never be exposed in public API responses or search results.
- **Direct Link Protection**: Physical file URLs should be temporary or signed, preventing hotlinking or unauthorized sharing.

### 6.3 Usability
- **Design System**: Strict adherence to the "Studio Precision" aesthetic (high contrast, #FF6B00 accents, dark mode default).
- **Feedback**: Every interactive element (buttons, forms) must provide immediate visual feedback (hover states, loading spinners).

### 6.4 Responsiveness
- **Mobile-First**: All layouts must scale perfectly down to 320px width screens. Touch targets must be at least 44x44px.
- **Adaptive Grids**: Grids (like Directories) must reflow cleanly from 1 column on mobile to up to 4 columns on ultra-wide desktop displays.

### 6.5 Reliability
- **Fault Tolerance**: The frontend must degrade gracefully if the storage backend goes offline, showing cached data or friendly error states rather than blank screens or raw JSON dumps.

---

## 7. Open Questions

The following product decisions are intentionally postponed to later phases:

1. **Authentication Mechanism**: How will the Admin authenticate? (e.g., Simple password, OAuth, JWT, session cookies).
2. **Telegram Storage Limits**: How will we handle files larger than Telegram's maximum bot API limits (typically 20MB or 50MB without local API server, up to 2GB with local)?
3. **Analytics**: Will we track download counts per asset in the future, and if so, how do we prevent artificial inflation?
4. **Metadata Schema**: Should metadata be strictly typed later on, or remain a flexible JSON payload permanently?
5. **Batch Uploading**: Will the admin eventually need to upload multiple files simultaneously to create multiple assets at once?
