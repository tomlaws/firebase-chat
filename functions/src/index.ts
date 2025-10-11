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
        text,
        timestamp: new Date(),
    };
    // Store message in Firestore under a chat document
    const participants = [uid, to].sort();
    const chatId = participants.join('_');
    const chatRef = db.collection('chats').doc(chatId);
    const messageBytes = Buffer.byteLength(text, 'utf8') + 1;

    // Append message to recentMessages
    await chatRef.set({
        participants,
        messages: FieldValue.arrayUnion(message),
        totalMessageBytes: FieldValue.increment(messageBytes),
        lastUpdated: new Date(),
    }, { merge: true });

    return { success: true, message };
});