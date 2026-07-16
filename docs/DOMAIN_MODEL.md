# MISTER CODERZ Vault Domain Model

This document serves as the single source of truth for the application's domain language and object model. It defines the core business entities, their properties, and their relationships within the MISTER CODERZ Vault ecosystem.

## 1. Ubiquitous Language & Core Entities

### Asset
The central entity of the system. For MISTER CODERZ Vault V1, an **Asset** represents exactly **one downloadable file**.
If a resource has multiple file formats or different versions, they are modeled as completely separate Assets. This guarantees simplicity in upload flows, Telegram backend mapping, metadata assignment, and search operations.
- **Properties**: 
  - `ID`: Unique identifier for the asset.
  - `Name`: Human-readable name of the asset.
  - `Size`: File size in bytes.
  - `CreatedAt`: Timestamp of upload.
  - `UpdatedAt`: Timestamp of last modification.

### Category
A hierarchical classification system utilized for the main directories (e.g., Games, Movies, Apps). 
- **Rule**: Each Asset belongs to exactly **one** primary category.

### Tag
Flexible, non-hierarchical labels used to enhance searching and filtering capabilities (e.g., `linux`, `sci-fi`, `4K`).
- **Rule**: Tags are many-to-many. An Asset can have multiple Tags; a Tag can apply to multiple Assets.

### File Type
The physical format extension or MIME type of the Asset (e.g., `.iso`, `.pdf`, `.flac`).
- **Rule**: An Asset has exactly **one** File Type (derived from the 1-to-1 Asset-to-file mapping).

### Version
A simple string property representing the specific iteration of the file (e.g., `v1.0.0-PROD`).
- **Rule**: Since one Asset equals one file, a Version is merely a descriptor attribute on the Asset, not a separate relational entity tracking history.

### Description
Rich text or markdown content that provides in-depth details, instructions, or synopses about the Asset.
- **Rule**: Each Asset has exactly **one** Description.

### Thumbnail
A visual representation (such as an image URL or reference) that visually identifies the Asset in the grid.
- **Rule**: Each Asset has exactly **one** Thumbnail.

### Visibility
Defines the access control for the Asset (e.g., `Public`, `Private`, `Admin-Only`).
- **Rule**: Each Asset has exactly **one** Visibility state.

### Metadata
A flexible key-value data structure for holding Asset-specific attributes that do not map to standard generic fields (e.g., `{ resolution: '4K', engine: 'Unreal 5', author: 'John Doe' }`).
- **Rule**: Each Asset has exactly **one** Metadata payload.

## 2. Entity-Relationship Diagram (ERD)

```text
                           +----------------+
                           |                |
                           |    Category    |
                           |                |
                           +--------+-------+
                                    |
                                    | (1)
                                    |
                                    | (belongs to)
                                    |
                                    v
+----------------+ (N)     (N)+-----+------+      (1) +----------------+
|                +<---------->+            +--------->+                |
|      Tag       | (has tags) |   Asset    | (has)    |   File Type    |
|                |            | (1 File)   |          |                |
+----------------+            +--+--+---+--+          +----------------+
                                 |  |   |
                    (has)    (1) |  |   | (1)  (has)
                  +--------------+  |   +----------------+
                  |                 | (1)                |
                  v                 |                    v
         +--------+-------+         |           +--------+-------+
         |                |         |           |                |
         |  Description   |         |           |   Thumbnail    |
         |                |         |           |                |
         +----------------+         |           +----------------+
                                    |
                                    | (has)
                                    v
                           +--------+-------+
                           |                |
                           |    Metadata    |
                           |                |
                           +----------------+
```

## 3. Design Principles
- **1-to-1 Simplicity**: By mapping 1 Asset strictly to 1 Physical File, we eliminate complex relational versioning and format-grouping logic.
- **Domain Focus**: This model dictates how the UI, backend interfaces, and eventual database schema should be structured. No business logic or database ORMs are implemented in Phase 2; this is purely a conceptual blueprint.
