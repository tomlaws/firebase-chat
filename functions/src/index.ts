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

const chunkLimit = 300; // 10000000 = 10MB
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

    if (data) {
        const existingBytes = Number(data.messageBytes || 0);
        // If adding this message would exceed the threshold, archive recentMessages
        if (existingBytes + messageSize > chunkLimit * 0.8) {
            const messagesToBeRemoved = data.recentMessages || [];
            await chatDoc.ref.update({
                recentMessages: FieldValue.arrayRemove(...messagesToBeRemoved),
                messageBytes: FieldValue.increment(-existingBytes)
            });
            // Create a new chunk document for recentMessages
            const chunkId = uuidv7();
            await db.collection('chats').doc(chatId)
                .collection('messages').doc(chunkId).set({
                    items: messagesToBeRemoved,
                });
        }
    }
    await chatDoc.ref.set({
        messageBytes: FieldValue.increment(messageSize),
        recentMessages: FieldValue.arrayUnion(message),
        members: members,
        updatedAt: new Date(),
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
    const usernameQuery = admin.firestore().collection('usernames').where('uid', '==', uid).limit(1);
    const users = await Promise.all(uid.map(async (uid: string) => {
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

export const searchUsersByUsername = onCall(async (request) => {
    if (!request.auth?.uid) {
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

export const onboardUser = onCall(async (request) => {
    const uid = request.auth?.uid;

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
        const newSnap = await t.get(newRef);
        if (newSnap.data()?.uid === uid) {
            // Username already set to this user, no-op
            return;
        }
        if (newSnap.exists) throw new Error('Username taken');

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