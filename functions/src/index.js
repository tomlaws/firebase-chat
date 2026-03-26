"use strict";
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardUser = exports.searchUsersByUsername = exports.getUserInfo = exports.sendMessage = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const uuid_1 = require("uuid");
const firestore_size_1 = __importDefault(require("firestore-size"));
const util_1 = require("./util");
// Start writing functions
// https://firebase.google.com/docs/functions/typescript
// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
(0, firebase_functions_1.setGlobalOptions)({ maxInstances: 10 });
// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = (0, firestore_1.getFirestore)();
exports.sendMessage = (0, https_1.onCall)(async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new Error('Authentication required');
    }
    const { text, to, timestamp } = request.data;
    if (!to || !text || typeof text !== 'string') {
        throw new Error('Invalid input');
    }
    // Prevent sending messages to self
    if (to === uid) {
        throw new Error('Cannot send message to self');
    }
    // Verify that the recipient exists
    const uidExists = await admin.auth().getUser(to).then(() => true).catch(() => false);
    if (!uidExists) {
        throw new Error('Recipient does not exist');
    }
    // Limit message length
    if (text.length > 200) {
        throw new Error('Message too long');
    }
    // Validate timestamp is a number
    if (typeof timestamp !== 'number') {
        throw new Error('Invalid timestamp');
    }
    // Limit timestamp to within 1 hour of current time
    const now = Date.now();
    if (timestamp < now - 3600000 || timestamp > now + 3600000) {
        throw new Error('Timestamp out of range');
    }
    // Generate sha256 hash
    const hash = await (0, util_1.truncatedSha256)(uid, timestamp);
    const message = {
        id: hash,
        uid,
        text,
        timestamp: firestore_1.Timestamp.now()
    };
    const messageSize = (0, firestore_size_1.default)(message);
    const members = [uid, to].sort();
    const chatId = members.join('_');
    const chatRef = db.collection('chats').doc(chatId);
    // Use a transaction for atomic chunking logic to prevent race conditions.
    // 800KB chunk limit perfectly respects Firestore's 1MB hardware limit.
    const maxChunkLimitBytes = 800000;
    await db.runTransaction(async (transaction) => {
        const chatDoc = await transaction.get(chatRef);
        const data = chatDoc.exists ? chatDoc.data() : null;
        const currentBytes = data ? Number(data.messageBytes || 0) : 0;
        // Check if adding this message exceeds the chunk limit
        if (data && currentBytes + messageSize > maxChunkLimitBytes) {
            // Need to archive currently stored messages and start a new chunk
            const existingMessages = data.recentMessages || [];
            // Create a chunk document to store the older messages
            const chunkId = (0, uuid_1.v7)();
            const chunkRef = chatRef.collection('messages').doc(chunkId);
            transaction.set(chunkRef, { items: existingMessages });
            // Reset the chat doc's recentMessages to contain just the new message
            transaction.set(chatRef, {
                members: members,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                lastMessageId: hash,
                recentMessages: [message],
                messageBytes: messageSize
            }, { merge: true });
        }
        else {
            // Under limit, just append to the current array safely
            transaction.set(chatRef, {
                members: members,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                lastMessageId: hash,
                recentMessages: firestore_1.FieldValue.arrayUnion(message),
                messageBytes: firestore_1.FieldValue.increment(messageSize)
            }, { merge: true });
        }
    });
    return { success: true, message };
});
exports.getUserInfo = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new Error('Authentication required');
    }
    const uid = Array.isArray(request.data.uid) ? request.data.uid : [request.data.uid];
    if (uid.length === 0) {
        throw new Error('No UIDs provided');
    }
    if (uid.length > 100) {
        throw new Error('Too many UIDs requested at once');
    }
    const usernameQuery = admin.firestore().collection('usernames').where('uid', '==', uid).limit(1);
    const users = await Promise.all(uid.map(async (uid) => {
        const [userDoc, user] = await Promise.all([usernameQuery.get(), admin.auth().getUser(uid)]);
        let username = null;
        let displayName = null;
        if (!userDoc.empty) {
            username = userDoc.docs[0].id;
        }
        displayName = user.displayName || null;
        return { uid, username, displayName };
    }));
    return users;
});
exports.searchUsersByUsername = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new Error('Authentication required');
    }
    const { username } = request.data;
    if (!username || typeof username !== 'string') {
        throw new Error('Invalid username');
    }
    // Limit length
    if (username.length < 3 || username.length > 24) {
        throw new Error('Username too long');
    }
    const query = db.collection('usernames')
        .orderBy('__name__')
        .startAt(`${username}`)
        .endAt(`${username}\uf8ff`)
        .limit(10);
    const snapshot = await query.get();
    if (snapshot.empty) {
        return [];
    }
    const users = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userRecord = await admin.auth().getUser(data.uid);
        return {
            uid: data.uid,
            username: doc.id,
            displayName: userRecord.displayName || null,
        };
    }));
    return users;
});
exports.onboardUser = (0, https_1.onCall)(async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new Error('Authentication required');
    }
    const { username, displayName } = request.data;
    if (!username || typeof username !== 'string' || username.length > 24) {
        throw new Error('Invalid username');
    }
    // Validate username
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
    }
    const oldRef = admin.firestore().collection('usernames').where('uid', '==', uid).limit(1);
    const newRef = admin.firestore().collection('usernames').doc(username);
    await admin.firestore().runTransaction(async (t) => {
        var _a;
        const newSnap = await t.get(newRef);
        if (((_a = newSnap.data()) === null || _a === void 0 ? void 0 : _a.uid) === uid) {
            // Username already set to this user, no-op
            return;
        }
        if (newSnap.exists)
            throw new Error('Username taken');
        if (oldRef) {
            const oldSnap = await t.get(oldRef);
            if (!oldSnap.empty) {
                const oldDoc = oldSnap.docs[0];
                if (oldDoc.id !== username) {
                    t.delete(oldDoc.ref);
                }
            }
        }
        t.set(newRef, { uid });
    });
    // Update Firebase Auth display name
    await admin.auth().updateUser(uid, {
        displayName: displayName || undefined,
    });
    // Update custom claims
    await admin.auth().setCustomUserClaims(uid, { username });
    return { success: true };
});
//# sourceMappingURL=index.js.map