import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// Hashmap to cache user info
const userCache: Record<string, Promise<any>> = {};

function getUsers(uid: string[]): Promise<any>[] {
    const getUserInfo = httpsCallable(functions, "getUserInfo");
    const missingUids = uid.filter((id) => !userCache[id]);
    if (missingUids.length > 0) {
        const promise = getUserInfo({ uid: missingUids });
        missingUids.forEach((id, index) => {
            userCache[id] = promise.then((res) => (res.data as any[])[index]);
        });
    }
    return uid.map((id) => userCache[id]);
}

function getUser(uid: string): Promise<any> {
    return getUsers([uid])[0];
}

export { getUsers, getUser };