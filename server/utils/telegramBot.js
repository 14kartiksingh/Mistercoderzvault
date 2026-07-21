const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const token = process.env.TELEGRAM_BOT_TOKEN;
const storageChannelId = process.env.TELEGRAM_STORAGE_CHANNEL_ID;
let bot = null;

const setCurrentUploadId = async (id, metadata) => {
  // Deactivate any existing active sessions to prevent state leakage
  await prisma.uploadSession.deleteMany({
    where: { status: 'waiting' }
  });
  // Create a new session in the database
  await prisma.uploadSession.create({
    data: {
      id: id,
      metadata: metadata || {},
      status: 'waiting',
      telegramUserId: null
    }
  });
  console.log(`[UploadSession] Started session ${id}`);
};

const markUploadComplete = async (id) => {
  if (id) {
    await prisma.uploadSession.updateMany({
      where: { id },
      data: { status: 'complete' }
    });
    console.log(`[UploadSession] Marked session ${id} as complete`);
  }
};

const checkUploadStatus = async (id) => {
  const session = await prisma.uploadSession.findUnique({
    where: { id }
  });
  if (session && session.status === 'complete') {
    try {
      await prisma.uploadSession.delete({ where: { id } });
    } catch (err) {}
    return 'complete';
  }
  return 'waiting';
};

const getActiveAssetId = async (id) => {
  const session = await prisma.uploadSession.findUnique({
    where: { id }
  });
  if (session && session.metadata) {
    const metadata = typeof session.metadata === 'string' ? JSON.parse(session.metadata) : session.metadata;
    return metadata.assetId || null;
  }
  return null;
};

const clearSession = async () => {
  await prisma.uploadSession.deleteMany({
    where: { status: 'waiting' }
  });
  console.log(`[UploadSession] Cleared all active waiting sessions`);
};

// Helper to check/bind Telegram User ID to active session
const getActiveSessionForUser = async (msgUserId, startParam = null) => {
  if (startParam) {
    const session = await prisma.uploadSession.findFirst({
      where: { id: startParam, status: 'waiting' }
    });
    if (session) {
      if (!session.telegramUserId) {
        const updated = await prisma.uploadSession.update({
          where: { id: session.id },
          data: { telegramUserId: String(msgUserId) }
        });
        return updated;
      }
      if (session.telegramUserId === String(msgUserId)) {
        return session;
      }
      return null;
    }
  }

  const boundSession = await prisma.uploadSession.findFirst({
    where: { telegramUserId: String(msgUserId), status: 'waiting' },
    orderBy: { createdAt: 'desc' }
  });
  if (boundSession) return boundSession;

  const unboundSession = await prisma.uploadSession.findFirst({
    where: { telegramUserId: null, status: 'waiting' },
    orderBy: { createdAt: 'desc' }
  });
  if (unboundSession) {
    const updated = await prisma.uploadSession.update({
      where: { id: unboundSession.id },
      data: { telegramUserId: String(msgUserId) }
    });
    return updated;
  }

  return null;
};

const initBot = () => {
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not set. Telegram bot will not start.');
    return;
  }

  const isFirstInstance = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';
  let shouldPoll = false;
  if (process.env.TELEGRAM_BOT_POLLING === 'true') {
    shouldPoll = true;
  } else if (process.env.TELEGRAM_BOT_POLLING === 'false') {
    shouldPoll = false;
  } else {
    // Default fallback: poll in dev, or poll only on first instance in prod (prevents 409 conflict)
    if (process.env.NODE_ENV !== 'production') {
      shouldPoll = true;
    } else {
      shouldPoll = isFirstInstance;
    }
  }

  bot = new TelegramBot(token, { polling: shouldPoll });
  if (shouldPoll) {
    console.log(`[Telegram Bot] Initialized and polling. (NODE_APP_INSTANCE: ${process.env.NODE_APP_INSTANCE || '0'})`);
  } else {
    console.log(`[Telegram Bot] Initialized (polling disabled). (NODE_APP_INSTANCE: ${process.env.NODE_APP_INSTANCE || 'none'})`);
  }

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

  console.log('[Telegram Bot] Registering /start command listener...');
  bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const startParam = match && match[1] ? match[1].trim() : null;
    
    console.log(`📥 [Telegram Bot] Received /start command from User: ${userId}, Chat: ${chatId}, startParam: "${startParam || ''}"`);

    const activeSession = await getActiveSessionForUser(userId, startParam);
    if (!activeSession) {
      const anyActive = await prisma.uploadSession.findFirst({
        where: { status: 'waiting' }
      });
      if (!anyActive) {
        bot.sendMessage(chatId, '❌ No active upload session.\n\nPlease start an upload from the Vault Admin Panel first.');
      } else {
        bot.sendMessage(chatId, '❌ Unauthorized.\n\nThis upload session is already in use by another administrator.');
      }
      return;
    }

    const metadata = typeof activeSession.metadata === 'string'
      ? JSON.parse(activeSession.metadata)
      : activeSession.metadata;

    bot.sendMessage(chatId, `Welcome to MISTER CODERZ Vault.\n\nActive Upload Session: "${metadata.title || 'Untitled'}" (${metadata.uploadType || 'SINGLE'}).\n\nSend me the file(s) you want to upload.`);
  });

  // Handle /done command
  console.log('[Telegram Bot] Registering /done message listener...');
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.trim() === '/done') {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      console.log(`📥 [Telegram Bot] Received message in /done listener: Chat: ${chatId}, User: ${userId}, Text: "${msg.text || ''}"`);

      const activeSession = await getActiveSessionForUser(userId);
      if (!activeSession) {
        const anyActive = await prisma.uploadSession.findFirst({
          where: { status: 'waiting' }
        });
        if (!anyActive) {
          bot.sendMessage(chatId, '❌ No active upload session.');
        } else {
          bot.sendMessage(chatId, '❌ Unauthorized.\n\nThis upload session is already in use by another administrator.');
        }
        return;
      }

      const metadata = typeof activeSession.metadata === 'string'
        ? JSON.parse(activeSession.metadata)
        : activeSession.metadata;

      const assetId = metadata.assetId;
      try {
        if (assetId) {
          await prisma.asset.update({
            where: { id: assetId },
            data: { isPending: false }
          });
        }
        await markUploadComplete(activeSession.id);
        const name = metadata.title || 'Upload';
        await clearSession();
        bot.sendMessage(chatId, `✅ Upload finished manually.\n\nAsset "${name}" is now available in the Vault.`);
      } catch (error) {
        console.error('Error in /done command:', error);
        bot.sendMessage(chatId, 'Error finishing upload. Please try again.');
      }
    }
  });

  // Handle various file types
  console.log('[Telegram Bot] Registering file upload message listener...');
  bot.on('message', async (msg) => {
    // Only process actual files/photos/videos/etc.
    if (!msg.document && !msg.video && !msg.audio && (!msg.photo || msg.photo.length === 0) && !msg.voice) {
      return;
    }

    // Ignore commands
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    console.log(`📥 [Telegram Bot] Received message in file upload listener: Chat: ${chatId}, User: ${userId}, Has document: ${!!msg.document}, Has video: ${!!msg.video}`);

    const activeSession = await getActiveSessionForUser(userId);
    if (!activeSession) {
      const anyActive = await prisma.uploadSession.findFirst({
        where: { status: 'waiting' }
      });
      if (!anyActive) {
        bot.sendMessage(chatId, '❌ No active upload session.\n\nPlease start an upload from the Vault Admin Panel first.');
      } else {
        bot.sendMessage(chatId, '❌ Unauthorized.\n\nThis upload session is already in use by another administrator.');
      }
      return;
    }

    const currentMetadata = typeof activeSession.metadata === 'string'
      ? JSON.parse(activeSession.metadata)
      : activeSession.metadata;
    
    let fileObj;
    let fileName;

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
            await markUploadComplete(activeSession.id);
            await clearSession();

            const successMsg = `✅ Upload completed.\n\nFilename:\n${fileName}\n\nYour file has been securely stored inside MISTER CODERZ Vault.`;
            bot.sendMessage(chatId, successMsg);
          } catch (dbError) {
            console.error('Error saving SINGLE asset to database:', dbError);
            bot.sendMessage(chatId, 'Error saving asset to database. Please try again.');
          }
        } else if (uploadType === 'MULTIPART') {
          // New MULTIPART upload or MULTIPART Append: Count files instead of matching
          const assetId = currentMetadata.assetId;
          const isAppend = currentMetadata.isAppend;
          const existingParts = currentMetadata.existingParts ? parseInt(currentMetadata.existingParts, 10) : 0;
          const expectedPartsToAdd = currentMetadata.expectedPartsToAdd ? parseInt(currentMetadata.expectedPartsToAdd, 10) : 0;
          const expectedParts = currentMetadata.expectedParts ? parseInt(currentMetadata.expectedParts, 10) : 0;
          
          try {
            // Count current files
            const currentFilesCount = await prisma.assetFile.count({
              where: { assetId: assetId }
            });

            const partNumber = currentFilesCount + 1;
            const finalFileName = fileName !== 'Document' ? fileName : `Part_${partNumber}`;
            
            // Create the new AssetFile record
            const newFile = await prisma.assetFile.create({
              data: {
                assetId: assetId,
                fileName: finalFileName,
                fileSize: BigInt(fileSize),
                telegramFileId: fileId,
                telegramMessageId: result.message_id,
                partNumber: partNumber
              }
            });

            // Update parent Asset sizeBytes
            const parentAsset = await prisma.asset.findUnique({ where: { id: assetId } });
            if (parentAsset) {
              await prisma.asset.update({
                where: { id: assetId },
                data: { sizeBytes: parentAsset.sizeBytes + BigInt(fileSize) }
              });
            }

            writeLog(userId, newFile.fileName, fileSize, fileId, 'SUCCESS');

            let isComplete = false;
            let progressMsg = '';
            
            if (isAppend) {
              const currentAdded = currentFilesCount + 1 - existingParts;
              console.log(`[Multipart Append] Received part ${currentAdded} / ${expectedPartsToAdd} for asset ${assetId}`);
              
              if (currentFilesCount + 1 >= existingParts + expectedPartsToAdd) {
                isComplete = true;
                progressMsg = `✅ All files appended successfully!\n\nAsset "${currentMetadata.title || 'Asset'}" is now updated.`;
              } else {
                progressMsg = `📥 Appending Parts...\n\n${currentAdded} / ${expectedPartsToAdd}`;
              }
            } else {
              console.log(`[Multipart] Received part ${partNumber} / ${expectedParts} for asset ${assetId}`);
              
              if (partNumber >= expectedParts) {
                isComplete = true;
                progressMsg = `✅ Upload completed.\n\nAsset "${currentMetadata.title || 'Asset'}" is now available in the Vault.`;
              } else {
                progressMsg = `📥 ${partNumber} / ${expectedParts} Parts Received.\n\nPlease send the next part.`;
              }
            }

            if (isComplete) {
              // Upload Complete
              await prisma.asset.update({
                where: { id: assetId },
                data: { isPending: false }
              });
              await markUploadComplete(activeSession.id);
              await clearSession();
              bot.sendMessage(chatId, progressMsg);
            } else {
              // Send progress message
              bot.sendMessage(chatId, progressMsg);
            }
          } catch (err) {
            console.error('Error processing MULTIPART asset file:', err);
            bot.sendMessage(chatId, 'Error saving part to database. Please try again.');
          }
        } else {
          // FOLDER or APPEND upload: match files using filename + fileSize
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
              // Check for file size divergence (e.g. Telegram compressed a photo)
              let sizeAdjustment = 0n;
              if (BigInt(fileSize) !== pendingFile.fileSize) {
                console.log(`[Folder Match] File size diverged. Expected: ${pendingFile.fileSize}, Actual: ${fileSize}. Adjusting...`);
                sizeAdjustment = BigInt(fileSize) - pendingFile.fileSize;
              }

              // Update the AssetFile record
              await prisma.assetFile.update({
                where: { id: pendingFile.id },
                data: {
                  telegramFileId: fileId,
                  telegramMessageId: result.message_id,
                  ...(sizeAdjustment !== 0n && { fileSize: BigInt(fileSize) })
                }
              });

              // Adjust parent Asset size if necessary
              if (sizeAdjustment !== 0n) {
                const parentAsset = await prisma.asset.findUnique({ where: { id: assetId } });
                if (parentAsset) {
                  await prisma.asset.update({
                    where: { id: assetId },
                    data: { sizeBytes: parentAsset.sizeBytes + sizeAdjustment }
                  });
                }
              }

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
                
                await markUploadComplete(activeSession.id);
                const assetName = currentMetadata.title || 'Asset';
                await clearSession();
                
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
const getBot = () => bot;
module.exports = {
  initBot,
  getBot,
  setCurrentUploadId,
  checkUploadStatus,
  markUploadComplete,
  getActiveAssetId,
  clearSession,
  getActiveSessionForUser
};