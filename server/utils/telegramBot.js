const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

const token = process.env.TELEGRAM_BOT_TOKEN;
const storageChannelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;
let bot = null;

let currentUploadId = null;
let currentMetadata = null;
let currentTelegramUserId = null; // Dynamically bound on first message/file during session
const completedUploads = new Set();

const setCurrentUploadId = (id, metadata) => {
  currentUploadId = id;
  currentMetadata = metadata;
  currentTelegramUserId = null;
};

const markUploadComplete = (id) => {
  if (id) {
    completedUploads.add(id);
  }
};

const checkUploadStatus = (id) => {
  if (completedUploads.has(id)) {
    completedUploads.delete(id); // Cleanup after reading
    return 'complete';
  }
  return 'waiting';
};

const getActiveAssetId = (id) => {
  if (currentUploadId === id && currentMetadata) {
    return currentMetadata.assetId || null;
  }
  return null;
};

const clearSession = () => {
  currentUploadId = null;
  currentMetadata = null;
  currentTelegramUserId = null;
};

const initBot = () => {
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not set. Telegram bot will not start.');
    return;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log('Telegram bot initialized and polling.');

  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const logFile = path.join(logsDir, 'telegram-upload.log');

  const writeLog = (userId, originalFilename, fileSize, fileId, status) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] UserID: ${userId} | Filename: ${originalFilename} | Size: ${fileSize} bytes | FileID: ${fileId} | Status: ${status}\n`;
    fs.appendFileSync(logFile, logLine);
  };

  const isAuthorized = (msgUserId) => {
    // If no session is active, unauthorized
    if (!currentUploadId) return false;

    // Dynamically bind to the first user sending a message/file
    if (!currentTelegramUserId) {
      currentTelegramUserId = String(msgUserId);
      console.log(`[Telegram Auth] Dynamically bound active session ${currentUploadId} to Telegram User ID: ${msgUserId}`);
      return true;
    }

    // Must match the bound user
    return String(msgUserId) === currentTelegramUserId;
  };

  bot.onText(/^\/start$/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!currentUploadId) {
      bot.sendMessage(chatId, '❌ No active upload session.\n\nPlease start an upload from the Vault Admin Panel first.');
      return;
    }

    if (!isAuthorized(userId)) {
      console.log(`[Telegram Auth] Session ${currentUploadId} already bound to another user. Rejecting User ID: ${userId}`);
      bot.sendMessage(chatId, '❌ Unauthorized.\n\nThis upload session is already in use by another administrator.');
      return;
    }

    bot.sendMessage(chatId, 'Welcome to MISTER CODERZ Vault.\n\nSend me the file you want to upload.');
  });

  // Handle /done command
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.trim() === '/done') {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      if (!currentUploadId) {
        bot.sendMessage(chatId, '❌ No active upload session.');
        return;
      }

      if (!isAuthorized(userId)) {
        bot.sendMessage(chatId, '❌ Unauthorized.\n\nThis upload session is already in use by another administrator.');
        return;
      }

      const assetId = currentMetadata.assetId;
      try {
        if (assetId) {
          await prisma.asset.update({
            where: { id: assetId },
            data: { isPending: false }
          });
        }
        markUploadComplete(currentUploadId);
        const name = currentMetadata.title || 'Upload';
        clearSession();
        bot.sendMessage(chatId, `✅ Upload finished manually.\n\nAsset "${name}" is now available in the Vault.`);
      } catch (error) {
        console.error('Error in /done command:', error);
        bot.sendMessage(chatId, 'Error finishing upload. Please try again.');
      }
    }
  });

  // Handle various file types
  bot.on('message', async (msg) => {
    // Ignore commands
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!currentUploadId) {
      bot.sendMessage(chatId, '❌ No active upload session.\n\nPlease start an upload from the Vault Admin Panel first.');
      return;
    }

    // Check authorization first
    if (!isAuthorized(userId)) {
      console.log(`[Telegram Auth] Unauthorized upload attempt from User ID: ${userId}`);
      bot.sendMessage(chatId, '❌ Unauthorized.\n\nThis upload session is already in use by another administrator.');
      return;
    }

    // Extract file info
    let fileObj = null;
    let fileName = 'Unknown';
    
    if (msg.document) {
      fileObj = msg.document;
      fileName = msg.document.file_name || 'Document';
    } else if (msg.video) {
      fileObj = msg.video;
      fileName = msg.video.file_name || 'Video';
    } else if (msg.audio) {
      fileObj = msg.audio;
      fileName = msg.audio.file_name || 'Audio';
    } else if (msg.photo && msg.photo.length > 0) {
      // Get the highest resolution photo
      fileObj = msg.photo[msg.photo.length - 1];
      fileName = 'Photo.jpg';
    } else if (msg.voice) {
      fileObj = msg.voice;
      fileName = 'Voice_Message.ogg';
    } else {
      // Not a file we want to process
      return;
    }

    const fileSize = fileObj.file_size || 0;
    const mimeType = fileObj.mime_type || 'Unknown';

    if (!storageChannelId) {
      console.error('TELEGRAM_STORAGE_CHANNEL_ID is not configured.');
      bot.sendMessage(chatId, 'Upload failed.\n\nPlease try again.');
      return;
    }

    try {
      // Use copyMessage instead of forwardMessage
      const result = await bot.copyMessage(storageChannelId, chatId, msg.message_id);
      
      // The result contains the new message_id in the destination channel, but we want the actual file_id which doesn't change
      const fileId = fileObj.file_id;

      console.log(`--- Telegram Upload ---`);
      console.log(`Filename: ${fileName}`);
      console.log(`File ID: ${fileId}`);
      console.log(`Mime Type: ${mimeType}`);
      console.log(`File Size: ${fileSize} bytes`);
      console.log(`-----------------------`);

      // Store Asset in Database if metadata is available
      if (currentMetadata) {
        const uploadType = currentMetadata.uploadType || 'SINGLE';

        if (uploadType === 'SINGLE') {
          try {
            // Prepare tags for Prisma connectOrCreate
            const tagConnectOrCreate = (currentMetadata.tags || []).map((t) => {
              const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              return {
                where: { slug },
                create: { name: t, slug },
              };
            });

            // Find or create category based on the name passed
            const categorySlug = currentMetadata.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            let category = await prisma.category.findUnique({
              where: { slug: categorySlug }
            });
            
            if (!category) {
              category = await prisma.category.create({
                data: {
                  name: currentMetadata.category,
                  slug: categorySlug
                }
              });
            }

            const newAsset = await prisma.asset.create({
              data: {
                name: currentMetadata.title || fileName,
                categoryId: category.id,
                contentType: mimeType,
                sizeBytes: BigInt(fileSize),
                description: currentMetadata.description || null,
                thumbnailUrl: currentMetadata.thumbnail || null,
                visibility: 'PRIVATE', // default
                uploadType: 'SINGLE',
                isPending: false,
                tags: {
                  connectOrCreate: tagConnectOrCreate,
                },
                files: {
                  create: {
                    fileName: fileName,
                    fileSize: BigInt(fileSize),
                    telegramFileId: fileId,
                    telegramMessageId: result.message_id
                  }
                }
              }
            });
            console.log(`Asset saved to database (SINGLE): ${newAsset.id}`);
            
            writeLog(userId, fileName, fileSize, fileId, 'SUCCESS');
            markUploadComplete(currentUploadId);
            clearSession();

            const successMsg = `✅ Upload completed.\n\nFilename:\n${fileName}\n\nYour file has been securely stored inside MISTER CODERZ Vault.`;
            bot.sendMessage(chatId, successMsg);
          } catch (dbError) {
            console.error('Error saving SINGLE asset to database:', dbError);
            bot.sendMessage(chatId, 'Error saving asset to database. Please try again.');
          }
        } else {
          // MULTIPART or FOLDER upload: match files using filename + fileSize
          const assetId = currentMetadata.assetId;
          try {
            // Find all pending files for this asset
            const pendingFiles = await prisma.assetFile.findMany({
              where: {
                assetId: assetId,
                telegramFileId: null
              }
            });

            let pendingFile = null;

            if (pendingFiles.length > 0) {
              // Priority 1: Unique file size match
              const sizeMatches = pendingFiles.filter(f => BigInt(f.fileSize) === BigInt(fileSize));
              if (sizeMatches.length === 1) {
                pendingFile = sizeMatches[0];
                console.log(`[Folder Match] Matched by unique file size: ${pendingFile.fileName} (${fileSize} bytes)`);
              } 
              
              // Priority 2: Size matches multiple files, prioritize by filename
              if (!pendingFile && sizeMatches.length > 1) {
                const nameMatch = sizeMatches.find(f => f.fileName.toLowerCase() === fileName.toLowerCase());
                if (nameMatch) {
                  pendingFile = nameMatch;
                  console.log(`[Folder Match] Matched by size & name: ${pendingFile.fileName}`);
                } else {
                  // Check extension match
                  const ext = path.extname(fileName).toLowerCase();
                  const extMatch = sizeMatches.find(f => path.extname(f.fileName).toLowerCase() === ext);
                  if (extMatch) {
                    pendingFile = extMatch;
                    console.log(`[Folder Match] Matched by size & extension: ${pendingFile.fileName}`);
                  } else {
                    // Fallback to the first size match
                    pendingFile = sizeMatches[0];
                    console.log(`[Folder Match] Matched by size fallback: ${pendingFile.fileName}`);
                  }
                }
              }

              // Priority 3: Filename match fallback (if size differs, e.g. compressed image/video)
              if (!pendingFile) {
                const nameMatch = pendingFiles.find(f => f.fileName.toLowerCase() === fileName.toLowerCase());
                if (nameMatch) {
                  pendingFile = nameMatch;
                  console.log(`[Folder Match] Matched by filename only: ${pendingFile.fileName}`);
                }
              }

              // Priority 4: Extension match fallback (if screen.png renamed to Photo.jpg, match same type)
              if (!pendingFile) {
                const ext = path.extname(fileName).toLowerCase();
                const extMatch = pendingFiles.find(f => path.extname(f.fileName).toLowerCase() === ext);
                if (extMatch) {
                  pendingFile = extMatch;
                  console.log(`[Folder Match] Matched by extension only: ${pendingFile.fileName}`);
                }
              }

              // Priority 5: Absolute fallback (first pending file)
              if (!pendingFile) {
                pendingFile = pendingFiles[0];
                console.log(`[Folder Match] Absolute fallback (first pending): ${pendingFile.fileName}`);
              }
            }

            if (pendingFile) {
              // Update the AssetFile record
              await prisma.assetFile.update({
                where: { id: pendingFile.id },
                data: {
                  telegramFileId: fileId,
                  telegramMessageId: result.message_id
                }
              });

              // Check if any files are still pending
              const remainingPending = await prisma.assetFile.count({
                where: {
                  assetId: assetId,
                  telegramFileId: null
                }
              });

              const totalFiles = await prisma.assetFile.count({
                where: { assetId: assetId }
              });

              const uploadedCount = totalFiles - remainingPending;
              writeLog(userId, fileName, fileSize, fileId, 'SUCCESS');

              if (remainingPending === 0) {
                // All files are uploaded! Set isPending: false on Asset
                await prisma.asset.update({
                  where: { id: assetId },
                  data: { isPending: false }
                });
                
                markUploadComplete(currentUploadId);
                const assetName = currentMetadata.title || 'Asset';
                clearSession();
                
                bot.sendMessage(chatId, `✅ All files uploaded successfully! (${uploadedCount}/${totalFiles})\n\nAsset "${assetName}" is now available in the Vault.`);
              } else {
                bot.sendMessage(chatId, `📥 File received: ${fileName}\nProgress: ${uploadedCount}/${totalFiles} files uploaded.`);
              }
            } else {
              bot.sendMessage(chatId, `⚠️ Received file "${fileName}" (${fileSize} bytes) but it does not match any pending files in your current upload session.`);
            }
          } catch (dbError) {
            console.error('Error matching file in MULTIPART/FOLDER upload:', dbError);
            bot.sendMessage(chatId, 'Error processing file. Please try again.');
          }
        }
      } else {
        // Active upload metadata missing but bot is authorized: handle as a generic single upload or log warning
        writeLog(userId, fileName, fileSize, fileId, 'SUCCESS');
        bot.sendMessage(chatId, `📥 Received "${fileName}". However, no active metadata session is running on the dashboard. Use the Admin Panel to set metadata.`);
      }

    } catch (error) {
      console.error('Error copying message to storage channel:', error.message);
      writeLog(userId, fileName, fileSize, fileObj.file_id, 'FAILED');
      
      const failureMsg = `Upload failed.\n\nPlease try again.`;
      bot.sendMessage(chatId, failureMsg);
    }
  });
};

module.exports = {
  initBot,
  setCurrentUploadId,
  checkUploadStatus,
  markUploadComplete,
  getActiveAssetId,
  clearSession
};
