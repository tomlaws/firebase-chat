/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onCall } from "firebase-functions/https";
import * as admin from 'firebase-admin';
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { v7 as uuidv7 } from 'uuid';
import sizeof from "firestore-size";

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
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Initialize the Firebase Admin SDK
admin.initializeApp();
const db = getFirestore();

const chunkLimit = 10000000; // 10MB
export const sendMessage = onCall(async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
        throw new Error('Authentication required');
    }

    const { text, to } = request.data;
    if (!to || !text || typeof text !== 'string') {
        throw new Error('Invalid input');
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

    const message = {
        uid,
        text,
        timestamp: new Date(),
    };
    const messageSize = sizeof(message);

    // Store message in Firestore under a chat document
    const members = [uid, to].sort();
    const chatId = members.join('_');
    const chatDoc = await db.collection('chats').doc(chatId).get();
    const data = chatDoc.exists ? chatDoc.data() : null;

    let lastChunkId = uuidv7();
    let lastChunkSize: FieldValue | number = FieldValue.increment(messageSize);

    if (data) {
        const existingLastChunkId = data.lastChunkId as string | undefined;
        const existingBytes = Number(data.lastChunkSize || 0);

        if (existingLastChunkId) lastChunkId = existingLastChunkId;

        // If adding this message would exceed the threshold, start a new chunk.
        if (existingBytes + messageSize > chunkLimit * 0.8) {
            lastChunkId = uuidv7();
            // For a new chunk we should initialize the byte count to this message's size.
            lastChunkSize = messageSize;
        }
    }

    await chatDoc.ref.set({
        lastChunkId,
        lastChunkSize,
    }, { merge: true });

    const messageChunk = db.collection('chats').doc(chatId).collection('messages').doc(lastChunkId);

    await messageChunk.set({
        items: FieldValue.arrayUnion(message),
    }, { merge: true });

    return { success: true, message };
});

export const getUserInfo = onCall(async (request) => {
    if (!request.auth?.uid) {
        throw new Error('Authentication required');
    }

    const uid = Array.isArray(request.data.uid) ? request.data.uid : [request.data.uid];
    if (uid.length === 0) {
        throw new Error('No UIDs provided');
    }

    if (uid.length > 100) {
        throw new Error('Too many UIDs requested at once');
    }

    const users = await Promise.all(uid.map(async (uid: string) => {
        console.log(`users/${uid}`);
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return { uid, nickname: 'Unknown' };
        }
        return userDoc.data();
    }));

    return users;
});