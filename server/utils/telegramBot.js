const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

const token = process.env.TELEGRAM_BOT_TOKEN;
const storageChannelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;
let adminId = process.env.TELEGRAM_ADMIN_ID ? String(process.env.TELEGRAM_ADMIN_ID) : null;

let bot = null;

let currentUploadId = null;
let currentMetadata = null;
const completedUploads = new Set();

const setCurrentUploadId = (id, metadata) => {
  currentUploadId = id;
  currentMetadata = metadata;
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
    return adminId && String(msgUserId) === adminId;
  };

  bot.onText(/^\/start$/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAuthorized(userId)) {
      console.log(`[Telegram Auth] Unauthorized access attempt from User ID: ${userId}`);
      bot.sendMessage(chatId, 'Unauthorized.');
      return;
    }

    bot.sendMessage(chatId, 'Welcome to MISTER CODERZ Vault.\n\nSend me the file you want to upload.');
  });

  // Handle /done command
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.trim() === '/done') {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      if (!isAuthorized(userId)) {
        bot.sendMessage(chatId, 'Unauthorized.');
        return;
      }

      if (!currentUploadId) {
        bot.sendMessage(chatId, 'No active upload session.');
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

    // Check authorization first
    if (!isAuthorized(userId)) {
      console.log(`[Telegram Auth] Unauthorized upload attempt from User ID: ${userId}`);
      bot.sendMessage(chatId, 'Unauthorized.');
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
            // Find a pending AssetFile record
            const pendingFile = await prisma.assetFile.findFirst({
              where: {
                assetId: assetId,
                fileName: fileName,
                fileSize: BigInt(fileSize),
                telegramFileId: null
              }
            });

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
